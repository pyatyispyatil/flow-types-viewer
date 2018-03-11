import React, {Component} from 'react';
import styles from './styles.scss';
import {getDeclaration} from './utils';

//https://youtrack.jetbrains.com/issue/WEB-21774
const cs = '{';
const ce = '}';

export class Node extends Component {
  getAssets(node) {
    const {parameters, args, node: currentNode, parent} = this.props;

    const constructedParameters = args ? args
      .reduce((acc, arg, index) => Object.assign(
        acc, {
          [currentNode.parameters[index].name]: arg
        }), {}) : parameters;

    return {
      node: (constructedParameters && constructedParameters[node.name]) || node,
      parent: args ? node : parent,
      parameters: constructedParameters
    }
  }

  render() {
    const {node, render} = this.props;
    const declaration = getDeclaration(node);

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
              <div className={styles.typeParametrizedGenericName}>
                {node.name}
              </div>
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
                    <div className={styles.typeObjectIndexKey}>[{render(this.getAssets(index.key))}]</div>
                    : {render(Object.assign(this.getAssets(index.value), {className: styles.typeObjectIndexValue}))}
                  </div>
                ))
              }
              {
                node.value.map((val) => (
                  <div className={styles.typeObjectProp}>
                    <div className={styles.typeObjectKey}>{val.key}</div>
                    : {render(Object.assign(this.getAssets(val), {className: styles.typeObjectValue}))}
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