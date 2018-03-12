import React, {PureComponent} from 'react';
import styles from './styles.scss';

//https://youtrack.jetbrains.com/issue/WEB-21774
const cs = '{';
const ce = '}';

export class Node extends PureComponent {
  getAssets(node) {
    const {parameters, args, node: currentNode, parent, declarations} = this.props;

    const constructedParameters = args ? args
      .reduce((acc, arg, index) => Object.assign(
        acc, {
          [currentNode.parameters[index].name]: arg
        }), {}) : parameters;

    return {
      node: (constructedParameters && constructedParameters[node.name]) || node,
      parent: args ? node : parent,
      parameters: constructedParameters,
      declarations
    }
  }

  render() {
    const {node, render, declarations} = this.props;
    const declaration = declarations[node.declarationId];

    switch (node.type) {
      case 'type':
        if (declaration) {
          return render(this.getAssets(declaration));
        } else {
          return <div className={styles.typeDeclaration}>{node.name}</div>
        }
      case 'generic':
        if (declaration && node.value) {
          return (
            <div className={styles.typeParametrizedGeneric}>
              {
                node.name ? (
                  <div className={styles.typeParametrizedGenericName}>
                    {node.name}
                  </div>
                ) : null
              }
              {render(Object.assign(this.getAssets(declaration), {args: node.value}))}
            </div>
          )
        } else {
          return (
            <div className={styles.typeGeneric}>
              {node.genericName + '<'}
              {
                node.value.map((val) => render(this.getAssets(val)))
              }
              {'>'}
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
        return (
          <div className={styles.typeObject}>
            {cs}
            <div className={styles.typeObjectChildren}>
              {
                node.indexers.map((index) => (
                  <div className={styles.typeObjectProp}>
                    <div className={styles.typeObjectIndexKey}>
                      [
                      {render(this.getAssets(index.key))}
                      ]
                    </div>
                    :
                    <div className={styles.typeObjectIndexValue}>
                      {render(this.getAssets(index.value))}
                    </div>
                  </div>
                ))
              }
              {
                node.value.map((val) => (
                  <div className={styles.typeObjectProp}>
                    <div className={styles.typeObjectKey}>
                      {val.key}
                    </div>
                    {val.optional && '?'}:
                    <div className={styles.typeObjectValue}>
                      {render(this.getAssets(val))}
                    </div>
                  </div>
                ))
              }
            </div>
            {ce}
          </div>
        );
      case 'primitive':
        return node.value;
      case 'stringLiteral':
        return `"${node.value}"`;
      default:
        return node.value || 'unhandled';
    }
  }
}