import React, {Component} from 'react';
import ReactDOM from 'react-dom';

import styles from './styles.scss';
import {StaticTree} from './static-tree';
import {ExpandableTree} from './expandable-node';

class Root extends Component {
  state = {
    searchWord: '',
    flatMode: false
  };

  render() {
    const {searchWord, flatMode} = this.state;

    return (
      <div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            Search: <input autoFocus onChange={(e) => this.setState({searchWord: e.target.value.toLowerCase()})}/>
          </div>
          <div className={styles.checkbox}>
            <input
              className={styles.checkboxInput}
              id="flatMode"
              type="checkbox"
              onChange={(e) => this.setState({flatMode: !this.state.flatMode})}
            />
            <label htmlFor="flatMode">Flat mode</label>
          </div>
        </div>
        {
          Object.entries(DATA.types)
            .map(([path, types]) => {
              const filteredTypes = searchWord ? types.filter(({name}) => name.toLowerCase().indexOf(searchWord) === 0) : types;

              return filteredTypes.length ? (
                <div>
                  <div className={styles.path}>
                    {path}
                  </div>
                  {
                    filteredTypes.map((type) => (
                      <div className={styles.rootType}>
                        {
                          flatMode ? (
                            <StaticTree node={type} isRoot={true}/>
                          ) : (
                            <ExpandableTree node={type} isRoot={true}/>
                          )
                        }
                      </div>
                    ))
                  }
                </div>
              ) : (null)
            })
        }
      </div>
    )
  }
}

ReactDOM.render(<Root/>, document.getElementById('root'));