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
    const {className, forceOpen} = this.props;

    return (
      <WrapNode className={className} {...this.props} forceOpen={forceOpen}>
        {this.renderNode()}
      </WrapNode>
    )
  }
}
