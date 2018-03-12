import React, {PureComponent} from 'react';

import styles from './styles.scss';
import {StaticTree} from './static-tree';
import {ExpandableTree} from './expandable-node';
import {Checkbox} from './components';
import {cn} from './utils';

const compareByName = ({name: fName}, {name: sName}) => fName.localeCompare(sName);
const byFirst = ([first], [second]) => first.localeCompare(second);

const getSortedTypesEntries = (typesEntries) =>
  typesEntries
    .reduce((acc, [path, pathTypes]) => [
      ...acc,
      [
        path,
        pathTypes.slice().sort(compareByName)
      ]
    ], [])
    .sort(byFirst);

const getSortedTypes = (types) => types.slice().sort(compareByName);

const getFilteredTypes = (types, searchWord) => (
  searchWord ? (
    types.filter(({name}) => name.toLowerCase().indexOf(searchWord) === 0)
  ) : (
    types
  )
);

class Directories extends PureComponent {
  render() {
    const {typesEntries, searchWord, declarations, flatMode} = this.props;

    return getSortedTypesEntries(typesEntries)
      .map(([path, pathTypes]) => {
        const filteredTypes = getFilteredTypes(pathTypes, searchWord);

        return filteredTypes.length ? (
          <div>
            <div className={styles.path}>
              {path}
            </div>
            <Types
              types={filteredTypes}
              declarations={declarations}
              flatMode={flatMode}
            />
          </div>
        ) : (null)
      })
  }
}

class Types extends PureComponent {
  render() {
    const {declarations, flatMode, types} = this.props;

    return types.map((type) => (
      <div className={styles.rootType}>
        {
          flatMode ? (
            <StaticTree declarations={declarations} node={type} isRoot={true}/>
          ) : (
            <ExpandableTree declarations={declarations} node={type} isRoot={true}/>
          )
        }
      </div>
    ));
  }
}

class SortedTypes extends PureComponent {
  render() {
    const {types, searchWord, declarations, flatMode} = this.props;

    return (
      <Types
        types={getSortedTypes(getFilteredTypes(types, searchWord))}
        declarations={declarations}
        flatMode={flatMode}
      />
    );
  }
}

export class Root extends PureComponent {
  state = {
    searchWord: '',
    flatMode: false,
    showDirectories: true,
    nestingVisualization: true
  };

  render() {
    const {types, declarations} = this.props;
    const {searchWord, showDirectories, flatMode, nestingVisualization} = this.state;
    const typesEntries = Object.entries(types);
    const allTypes = typesEntries.reduce((acc, [path, pathTypes]) => acc.concat(pathTypes), []);

    return (
      <div className={styles.base}>
        <div className={styles.header}>
          <div className={styles.toolbar}>
            Total count: {allTypes.length}
          </div>
          <div className={styles.toolbar}>
            <div className={styles.search}>
              Search: <input autoFocus onChange={(e) => this.setState({searchWord: e.target.value.toLowerCase()})}/>
            </div>
            <Checkbox
              value={flatMode}
              onChange={(flatMode) => this.setState({flatMode})}
            >
              Flat mode
            </Checkbox>
            <Checkbox
              value={showDirectories}
              onChange={(showDirectories) => this.setState({showDirectories})}
            >
              Show directories
            </Checkbox>
            <Checkbox
              value={nestingVisualization}
              onChange={(nestingVisualization) => this.setState({nestingVisualization})}
            >
              Nesting visualization
            </Checkbox>
          </div>
          {
            searchWord ? (
              <div className={styles.toolbar}>
                Found: {
                allTypes.filter(({name}) => name.toLowerCase().indexOf(searchWord) === 0).length
              }
              </div>
            ) : null
          }
        </div>
        <div className={cn(
          styles.root, {
            [styles.nestingVisualization]: nestingVisualization
          }
        )}>
          {
            showDirectories ? (
              <Directories
                typesEntries={typesEntries}
                searchWord={searchWord}
                declarations={declarations}
                flatMode={flatMode}
              />
            ) : (
              <SortedTypes
                types={allTypes}
                searchWord={searchWord}
                declarations={declarations}
                flatMode={flatMode}
              />
            )
          }
        </div>
      </div>
    )
  }
}