import React, {Component} from 'react';

import styles from './styles.scss';
import {StaticTree} from './static-tree';
import {ExpandableTree} from './expandable-node';

const arraysLength = (entries, handler = (item) => item) => entries
  .reduce((acc, [key, array]) => handler(array).length + acc, 0);

export class Root extends Component {
  state = {
    searchWord: '',
    flatMode: false
  };

  render() {
    const {declarations, types} = this.props;
    const {searchWord, flatMode} = this.state;
    const typesEntries = Object.entries(types);

    return (
      <div>

        <div className={styles.toolbar}>
          Total count: {arraysLength(typesEntries)}
        </div>
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
          searchWord ? (
            <div className={styles.toolbar}>
              Found: {
              arraysLength(typesEntries, (pathTypes) => pathTypes
                .filter(({name}) => name.toLowerCase().indexOf(searchWord) === 0))
            }
            </div>
          ) : null
        }
        {
          typesEntries
            .map(([path, pathTypes]) => {
              const filteredTypes = searchWord ? pathTypes.filter(({name}) => name.toLowerCase().indexOf(searchWord) === 0) : pathTypes;

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
                            <StaticTree declarations={declarations} node={type} isRoot={true}/>
                          ) : (
                            <ExpandableTree declarations={declarations} node={type} isRoot={true}/>
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