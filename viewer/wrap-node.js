import React, {PureComponent, Fragment} from 'react';

import styles from './styles.scss';
import {cn} from './utils';


export class WrapNode extends PureComponent {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  render() {
    const {node, children, className, force, parent} = this.props;
    const {collapsed} = this.state;
    const canWrap = force || (node.id && node.id.name && !node.declarationId && (!node.builtin || node.genericName !== node.id.name));
    const nodeHasContent = node.value || node.args || node.returnType;

    return (
      <div className={cn(styles.treeView, className)}>
        {
          canWrap ? (
            <Fragment>
              <div className={styles.nodeTitle} onClick={this.handleClick}>
                {
                  parent && parent.id && parent.id.name && node.id && node.id.name ? (
                    <div className={styles.nodeParentTitle}>
                      {parent.id.name}
                    </div>
                  ) : null
                }
                {node.id && node.id.name}
                {node.parameters ? (
                  <div className={styles.typeParametrizedGenericArguments}>
                    {'<'}
                    {
                      node.parameters.map(({name}) => (
                        <div className={styles.typeParametrizedGenericArgument}>
                          {name}
                        </div>
                      ))
                    }
                    {'>'}
                  </div>
                ) : null}
              </div>
              <div className={cn(styles.nodeChildrenWrapper, {[styles.expanded]: !collapsed})}>
                {!collapsed && nodeHasContent ? (
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
