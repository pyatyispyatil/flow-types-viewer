import React, {PureComponent} from 'react';
import styles from './styles.scss';

import {cn} from './utils';

//https://youtrack.jetbrains.com/issue/WEB-21774
const cs = '{';
const ce = '}';

export class Node extends PureComponent {
  getAssets(node) {
    const {parameters, args, node: currentNode, parent, declarations, builtins, nodeView} = this.props;

    const constructedParameters = args ? args
      .reduce((acc, arg, index) => Object.assign(
        acc, {
          [currentNode.parameters[index].name]: arg
        }), {}) : parameters;

    const newNode = parent && constructedParameters ? (
      (constructedParameters[node.id ? node.id.name : node.genericName]) || node
    ) : node;

    return {
      node: newNode,
      parent: args ? parent : currentNode,
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

  render() {
    const {node, render, declarations, parent, builtins} = this.props;
    const declaration = declarations[node.declarationId] || (builtins ? builtins[node.declarationId] : undefined);

    switch (node.type) {
      case 'type':
        if (declaration) {
          return render(this.getAssets(declaration));
        } else {
          return <div className={styles.typeDeclaration}>{(node.id && node.id.name) || node.genericName}</div>
        }
      case 'generic':
        if (declaration && node.value) {
          return (
            <div className={styles.typeParametrizedGeneric}>
              {render(Object.assign(this.getAssets(declaration), {args: node.value}))}
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
                name ? (
                  <div className={styles.typeParametrizedGenericArguments}>
                    {'<'}
                    {
                      node.value.map((val) => (
                        <div className={styles.typeParametrizedGenericArgument}>
                          {render(this.getAssets(val))}
                        </div>
                      ))
                    }
                    {'>'}
                  </div>
                ) : null
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
      case 'class':
        return (
          <div className={styles.typeClass}>
            <div className={styles.typeClassHeader}>
              <div className={styles.typeClassName}>
                {
                  node.id.name
                }
              </div>
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
      default:
        return 'unhandled';
    }
  }
}
