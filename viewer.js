import React, {Component, Fragment} from 'react';
import ReactDOM from 'react-dom';

import styles from './styles.scss';

//https://youtrack.jetbrains.com/issue/WEB-21774
const cs = '{';
const ce = '}';

class TreeNode extends Component {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  renderNode() {
    const {node} = this.props;

    switch (node.type) {
      case 'type':
        return <TreeNode node={DATA.declarations[node.declarationId]}/>;
      case 'generic':
        return (
          <div>
            {
              node.value.map((val) => <TreeNode node={val}/>)
            }
          </div>
        );
      case 'union':
        return (
          <div>
            {
              node.value.map((val) => (
                <div className={styles.typeUnionItem}>| <TreeNode node={val}/></div>
              ))
            }
          </div>
        );
      case 'intersection':
        return (
          <div className={styles.typeIntersection}>
            {
              node.value.map((item) => (
                <TreeNode node={item} className={styles.typeIntersectionItem}/>
              ))
            }
          </div>
        );
      case 'object':
        return (
          <div>
            {cs}
            <div style={{paddingLeft: '14px'}}>
              {
                node.value.map((value) => (
                  <div className={styles.typeObjectProp}>
                    <div>{value.key}</div>
                    : <TreeNode node={value}/>
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

  render() {
    const {collapsed} = this.state;
    const {node} = this.props;

    return (
      <div className={styles.treeView}>
        {
          node.name && !node.declarationId ? (
            <Fragment>
              <div className={styles.nodeTitle} onClick={this.handleClick}>
                {node.name}
              </div>
              <div>
                {collapsed ? null : this.renderNode()}
              </div>
            </Fragment>
          ) : (this.renderNode())
        }
      </div>
    )
  }
}

ReactDOM.render((
  <div>
    {
      DATA.types.map((type) => (
        <div className={styles.rootType}>
          <TreeNode node={type}/>
        </div>
      ))
    }
  </div>
), document.getElementById('root'));