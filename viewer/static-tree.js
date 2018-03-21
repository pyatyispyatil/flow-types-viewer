import React, {PureComponent} from 'react';
import {WrapNode} from './wrap-node';
import {Node} from './node';
import {ExpandableTree} from './expandable-tree';

export class StaticTree extends PureComponent {
  flatItems = (items) => {
    const {nodeView: {flatIntersections, flatObjects}} = this.props;

    return items.reduce((acc, item) => {
      if (item.type === 'type') {
        const declaration = this.props.declarations[item.declarationId];

        if (declaration) {
          if (declaration.type === 'intersection') {
            return acc.concat(...this.flatItems(declaration.value))
          } else {
            return acc.concat(...declaration.value);
          }
        }
      } else if (item.type === 'object' && item.value) {
        return acc.concat(...item.value.map(this.expandDeclarations));
      } else {
        return acc.concat(item);
      }

      return acc;
    }, []);
  };

  expandDeclarations = (node) => {
    const value = node.type === 'intersection' ? this.flatItems(node.value) : {};

    return value && value.length ? {
      ...node,
      ...(
        value ? {
          value,
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

    if (parents.filter((parent) => node.id && (parent === node.id.name)).length < 2) {
      if (node.type === 'function') {
        return <ExpandableTree {...this.props} isRoot={true}/>
      } else {
        const newNode = this.expandDeclarations(node);
        const newParents = !node.builtin && node.id ? parents.concat(node.id.name) : parents;

        return (
          <Node
            {...this.props}
            node={newNode}
            render={(props) => <StaticTree {...props} parents={newParents}/>}
          />
        );
      }
    } else {
      return <StaticTree {...this.props} node={node} parents={node.id ? [node.id.name] : []} isRoot={true}/>;
    }
  };

  render() {
    const {isRoot, className} = this.props;

    if (isRoot) {
      return (
        <WrapNode className={className} {...this.props} force>
          {this.renderNode()}
        </WrapNode>
      );
    } else {
      return this.renderNode();
    }
  }
}
