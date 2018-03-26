import React, {PureComponent, Fragment} from 'react';

import styles from './styles.scss';
import {cn} from './utils';


export class WrapNode extends PureComponent {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  render() {
    const {node, children, className, force, parent, forceOpen, renderedArgs} = this.props;
    const {collapsed} = this.state;
    const nodeHasContent = node.value || node.args || node.returnType;
    const canWrap = force || (node.id && node.id.name && nodeHasContent);
    const nullable = node.nullable;

    return (
      <div className={cn(styles.treeView, className)}>
        {
          canWrap ? (
            <Fragment>
              <div className={styles.nodeTitle}>
                <div className={styles.nodeName} onClick={this.handleClick}>
                {
                  nullable ?
                    '?' : ''
                }
                {node.id && node.id.name}
                </div>
                {
                  renderedArgs ? (
                    <div className={styles.typeParametrizedGenericArguments}>
                      {'<'}
                      {
                        renderedArgs.map((arg) => (
                          <div className={styles.typeParametrizedGenericArgument}>
                            {arg}
                          </div>
                        ))
                      }
                      {'>'}
                    </div>
                  ) : null
                }
                {
                  !renderedArgs && node.typeParameters ? (
                    <div className={styles.typeParametrizedGenericArguments}>
                      {'<'}
                      {
                        node.typeParameters.map(({name}) => (
                          <div className={styles.typeParametrizedGenericArgument}>
                            {name}
                          </div>
                        ))
                      }
                      {'>'}
                    </div>
                  ) : null
                }
              </div>
              <div className={cn(styles.nodeChildrenWrapper, {[styles.expanded]: !collapsed || forceOpen})}>
                {(!collapsed || forceOpen) && nodeHasContent ? (
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
