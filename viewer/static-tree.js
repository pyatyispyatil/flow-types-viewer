import React, {Component} from 'react';
import {getDeclaration} from './utils';
import {WrapNode} from './wrap-node';
import {Node} from './node';

export class StaticTree extends Component {
  flatItems = (items) => items.reduce((acc, item) => {
    if (item.type === 'type') {
      const declaration = getDeclaration(item);

      if (declaration) {
        return acc.concat(...(
          declaration.type === 'intersection' ? this.flatItems(declaration.value) : declaration.value
        ));
      }
    } else if (item.type === 'object' && item.value) {
      return acc.concat(...item.value.map(this.expandDeclarations));
    } else {
      return acc.concat(item);
    }

    return acc;
  }, []);

  expandDeclarations = (node) => {
    const value = node.type === 'intersection' ? this.flatItems(node.value) : {};

    return value && value.length ? {
      ...node,
      ...(
        value ? {
          value,
          indexers: [],
          type: 'object'
        } : {}
      )
    } : node
  };

  renderNode = () => {
    const {node, parents = []} = this.props;

    if (!node) {
      return null;
    }

    if (parents.filter((parent) => parent === node.name).length < 2) {
      const newNode = this.expandDeclarations(node);
      const newParents = !node.builtin ? parents.concat(node.name) : parents;

      return (
        <Node
          {...this.props}
          node={newNode}
          render={(props) => <StaticTree {...props} parents={newParents}/>}
        />
      );
    } else {
      return <StaticTree node={node} parents={[node.name]} isRoot={true}/>;
    }
  };

  render() {
    const {isRoot, node, className} = this.props;

    if (isRoot) {
      return (
        <WrapNode className={className} node={node} force>
          {this.renderNode()}
        </WrapNode>
      );
    } else {
      return this.renderNode();
    }
  }
}