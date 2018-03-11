import React, {Component, Fragment} from 'react';

import styles from './styles.scss';
import {cn} from './utils';


export class WrapNode extends Component {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  render() {
    const {node, children, className, force} = this.props;
    const {collapsed} = this.state;
    const canWrap = force || (node.name && !node.declarationId && (!node.builtin || node.genericName !== node.name));

    return (
      <div className={cn(styles.treeView, className)}>
        {
          canWrap ? (
            <Fragment>
              <div className={styles.nodeTitle} onClick={this.handleClick}>
                {node.name}
                {node.parameters ? (
                  `<${node.parameters.map(({name}) => name).join(', ')}>`
                ) : null}
              </div>
              <div className={cn(styles.nodeChildrenWrapper, {[styles.expanded]: !collapsed})}>
                {!collapsed && node.value ? (
                  <div className={styles.nodeChildren}>
                    {children}
                  </div>
                ) : null}
              </div>
            </Fragment>
          ) : (children)
        }
      </div>
    )
  }
}