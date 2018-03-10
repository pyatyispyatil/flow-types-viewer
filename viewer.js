import React, {Component, Fragment} from 'react';
import ReactDOM from 'react-dom';

import styles from './styles.scss';

//https://youtrack.jetbrains.com/issue/WEB-21774
const cs = '{';
const ce = '}';

const getDeclaration = (node) => DATA.declarations[node.declarationId];

class TreeNode extends Component {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  getAssets(assetedNode) {
    const {parameters, args, node} = this.props;

    const constructedParameters = args ? args
      .reduce((acc, arg, index) => Object.assign(
        acc, {
          [node.parameters[index].name]: arg
        }), {}) : parameters;

    return {
      node: (constructedParameters && constructedParameters[assetedNode.name]) || assetedNode,
      parameters: constructedParameters
    }
  }

  renderNode() {
    const {node} = this.props;
    const declaration = getDeclaration(node);


    switch (node.type) {
      case 'type':
        return <TreeNode {...this.getAssets(declaration)}/>;
      case 'generic':
        if (declaration && node.value) {
          return (
            <div className={styles.typeParametrizedGeneric}>
              {node.name + ' <- '}
              <TreeNode {...this.getAssets(declaration)} args={node.value}/>
            </div>
          )
        } else {
          return (
            <div className={styles.typeGeneric}>
              {
                node.value.map((val) => <TreeNode {...this.getAssets(val)}/>)
              }
            </div>
          );
        }
      case 'union':
        return (
          <div>
            {
              node.value.map((val) => (
                <div className={styles.typeUnionItem}>| <TreeNode {...this.getAssets(val)}/></div>
              ))
            }
          </div>
        );
      case 'intersection':
        return (
          <div className={styles.typeIntersection}>
            {
              node.value.map((val) => (
                <TreeNode className={styles.typeIntersectionItem} {...this.getAssets(val)}/>
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
                node.indexers.map((index) => (
                  <div className={styles.typeObjectProp}>
                    <div className={styles.typeObjectIndex}>[<TreeNode {...this.getAssets(index.key)}/>]</div>
                    : <TreeNode {...this.getAssets(index.value)}/>
                  </div>
                ))
              }
              {
                node.value.map((val) => (
                  <div className={styles.typeObjectProp}>
                    <div>{val.key}</div>
                    : <TreeNode {...this.getAssets(val)}/>
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
    const {node, className} = this.props;

    return (
      <div className={styles.treeView + (className ? ' ' + className : '')}>
        {
          node.name && !node.declarationId ? (
            <Fragment>
              <div className={styles.nodeTitle} onClick={this.handleClick}>
                {node.name}
              </div>
              <div>
                {!collapsed && node.value ? this.renderNode() : null}
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