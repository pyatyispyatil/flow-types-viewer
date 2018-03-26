import React, {PureComponent} from 'react';
import styles from './styles.scss';

import {cn} from './utils';

//https://youtrack.jetbrains.com/issue/WEB-21774
const cs = '{';
const ce = '}';

const getParametersMap = (typeParameters, parameters) => typeParameters
  .reduce((acc, typeParameter, index) => parameters[index] ? Object.assign(
    acc, {
      [typeParameter.name || typeParameter.id.name]: parameters[index]
    }) : acc, {});

const replaceGenericsParameters = (parameters, node) => {
  if (parameters[node.name || (node.id && node.id.name)]) {
    return parameters[node.name || (node.id && node.id.name)];
  }

  const getNode = (val) => parameters[val.name || (val.id && val.id.name)] || replaceGenericsParameters(parameters, val);
  const mapNodes = (nodes) => nodes
    .map(getNode);

  return {
    ...node,
    value: Array.isArray(node.value) ? mapNodes(node.value) : (node.value && node.value.type ? getNode(node.value) : node.value),
    typeParameters: node.typeParameters && mapNodes(node.typeParameters)
  }
};

export class Node extends PureComponent {
  getParameters(node) {
    const {parameters, declarations, builtins} = this.props;
    const {typeParameters} = node;
    const declaration = declarations[node.declarationId] || (builtins ? builtins[node.declarationId] : undefined);

    const translatedTypeParameters = parameters && typeParameters ? (
      typeParameters.map((node) => replaceGenericsParameters(parameters, node))
    ) : typeParameters;

    return declaration && declaration.typeParameters && translatedTypeParameters ? (
      getParametersMap(declaration.typeParameters, translatedTypeParameters)
    ) : (
      parameters
    );
  }

  getAssets(node) {
    const {typeParameters} = node;
    const {node: currentNode, parameters, parent, declarations, builtins, nodeView, render} = this.props;
    const declaration = declarations[node.declarationId] || (builtins ? builtins[node.declarationId] : undefined);

    let constructedParameters = this.getParameters(node);

    const newNode = constructedParameters ? (
      constructedParameters[node.name || (node.id && node.id.name)] || declaration || node
    ) : declaration || node;

    const translatedTypeParameters = constructedParameters && typeParameters ? (
      typeParameters.map((param) => constructedParameters[param.name || (param.id && param.id.name)] || param)
    ) : typeParameters;

    return {
      renderedArgs: translatedTypeParameters && translatedTypeParameters
        .map((arg) => render(this.getAssets(parameters ? replaceGenericsParameters(parameters, arg) : arg))),
      node: newNode,
      parent: currentNode.typeParameters ? currentNode : parent,
      parameters: constructedParameters,
      declarations,
      builtins,
      nodeView
    }
  }

  renderObjectProp = (prop) => {
    const {render} = this.props;

    switch (prop.propType) {
      case 'indexer':
        return (
          <div className={styles.typeObjectProp}>
            <div className={styles.typeObjectIndexKey}>
              [
              {render(this.getAssets(prop.key))}
              ]
            </div>
            :
            <div className={styles.typeObjectIndexValue}>
              {render(this.getAssets(prop.value))}
            </div>
          </div>
        );
      case 'prop':
        return (
          <div className={styles.typeObjectProp}>
            {
              prop.static ?
                <div className={styles.typeObjectStatic}/>
                : null
            }
            <div className={styles.typeObjectKey}>
              {prop.key}
            </div>
            {prop.optional && '?'}:
            <div className={styles.typeObjectValue}>
              {render(this.getAssets(prop))}
            </div>
          </div>
        );
      case 'call':
        return (
          <div className={styles.typeObjectProp}>
            <div className={styles.typeObjectValue}>
              {render(this.getAssets(prop))}
            </div>
          </div>
        );
    }
  };

  renderGenericParameters() {
    const {node, render, args} = this.props;
    const parameters = this.getParameters(node);
    const items = args || node.typeParameters;

    return items && items.length ? (
      <div className={styles.typeParametrizedGenericArguments}>
        {'<'}
        {
          items.map((val) => (
            <div className={styles.typeParametrizedGenericArgument}>
              {render(this.getAssets(parameters ? parameters[val.id ? val.id.name : val.name] || val : val))}
            </div>
          ))
        }
        {'>'}
      </div>
    ) : null;
  }

  getDeclaration(node) {
    const {declarations, builtins} = this.props;

    return declarations[node.declarationId] || (builtins ? builtins[node.declarationId] : undefined);
  }

  render() {
    const {node, render, declarations, parent, parameters} = this.props;
    const declaration = this.getDeclaration(node);

    switch (node.type) {
      case 'type':
        return (
          <div className={styles.typeDeclaration}>
            {/*<div className={styles.typeDeclarationName}>{node.id && node.id.name}{this.renderGenericParameters()}</div>*/}
            <div className={styles.typeDeclarationValue}>{render(this.getAssets(node.value))}</div>
          </div>
        );
      case 'generic':
        if (declaration) {
          return (
            <div className={styles.typeParametrizedGeneric}>
              {render(this.getAssets(node, declaration))}
            </div>
          )
        } else {
          const name = node.genericName || (node.id && node.id.name) || parent && parent.id && parent.id.name;

          return (
            <div className={styles.typeGeneric}>
              {
                name
              }
              {
                name ? this.renderGenericParameters() : null
              }
            </div>
          );
        }
      case 'union':
        return (
          <div>
            {
              node.value.map((val) => (
                <div className={styles.typeUnionItem}>| {render(this.getAssets(val))}</div>
              ))
            }
          </div>
        );
      case 'intersection':
        return (
          <div className={styles.typeIntersection}>
            {
              node.value
                .map((val) => (
                  render(Object.assign(this.getAssets(val), {className: styles.typeIntersectionItem}))
                ))
            }
          </div>
        );
      case 'object':
        const hasContent = node.value.length > 0;

        return (
          <div className={cn(styles.typeObject, {[styles.typeObjectEmpty]: !hasContent})}>
            {cs}
            {
              hasContent ? (
                <div className={styles.typeObjectChildren}>
                  {
                    node.value.map(this.renderObjectProp)
                  }
                </div>
              ) : null
            }
            {ce}
          </div>
        );
      case 'interface':
      case 'class':
        return (
          <div className={styles.typeClass}>
            <div className={styles.typeClassHeader}>
              {
                node.type
              }
              <div className={styles.typeClassName}>
                {
                  node.id.name
                }
              </div>
              {this.renderGenericParameters()}
              {
                node.parents.length ? (
                  <div className={styles.typeClassParent}>
                    {
                      node.parents.map((parent) => render(this.getAssets(parent)))
                    }
                  </div>
                ) : null
              }
              {cs}
            </div>
            <div className={styles.typeObjectChildren}>
              {
                node.value.map(this.renderObjectProp)
              }
            </div>
            {ce}
          </div>
        );
      case 'function':
        if (declaration) {
          return render(this.getAssets(declaration));
        } else {
          const manyArgsStyles = {
            [styles.typeFunctionManyArgs]: node.args.length > 2
          };

          return (
            <div className={cn(styles.typeFunction, manyArgsStyles)}>
              {this.renderGenericParameters()}
              <div className={cn(styles.typeFunctionArgs, manyArgsStyles)}>
                (
                {
                  node.args.map((arg) => (
                    <div className={cn(styles.typeFunctionArg, manyArgsStyles)}>
                      {arg.name ? <div className={styles.typeFunctionArgName}>{arg.name}</div> : null}
                      {render(this.getAssets(arg.value))}
                    </div>
                  ))
                }
              </div>
              <div className={styles.typeFunctionEnding}>
                )
                <div className={cn(styles.typeFunctionReturn, manyArgsStyles)}>
                  {render(this.getAssets(node.returnType))}
                </div>
              </div>
            </div>
          )
        }
      case 'export':
        const valueDeclaration = declarations[node.value && node.value.declarationId];

        return (
          <div className={styles.typeExport}>
            {
              render(Object.assign(this.getAssets(valueDeclaration || node.value), {parent: null}))
            }
          </div>
        );
      case 'tuple':
        return (
          <div className={styles.typeTuple}>
            [
            {
              node.value
                .map((val) => (
                  render(Object.assign(this.getAssets(val), {className: styles.typeTupleItem}))
                ))
            }
            ]
          </div>
        );
      case 'numberLiteral':
      case 'primitive':
        return node.value;
      case 'booleanLiteral':
        return node.value ? 'true' : 'false';
      case 'stringLiteral':
        return `"${node.value}"`;
      case 'variable':
        return (
          <div className={styles.typeVariable}>
            {
              node.id.name
            }
            {
              <div className={styles.typeVariableType}>
                {
                  render(Object.assign(this.getAssets(node.value), {parent: null}))
                }
              </div>
            }
          </div>
        );
      case 'void':
      case 'any':
      case 'mixed':
      case 'null':
        return <div className={styles[node.type]}>{node.type}</div>;
      case 'typeParameter':
        return parameters && parameters[node.name] ? (
          render(this.getAssets(parameters[node.name]))
        ) : node.name || null;
      case 'exists':
        return '*';
      default:
        return 'unhandled';
    }
  }
}
