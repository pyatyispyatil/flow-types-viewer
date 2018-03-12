import React, {PureComponent} from 'react';
import {WrapNode} from './wrap-node';
import {Node} from './node';

export class ExpandableTree extends PureComponent {
  renderNode = () => {
    return <Node
      {...this.props}
      render={(props) => <ExpandableTree {...props}/>}
    />;
  };

  render() {
    const {node, className} = this.props;

    return (
      <WrapNode className={className} node={node}>
        {this.renderNode()}
      </WrapNode>
    )
  }
}
