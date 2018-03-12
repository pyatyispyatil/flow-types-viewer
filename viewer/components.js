import React, {PureComponent} from 'react';

import styles from './styles.scss';

let counter = 0;

export class Checkbox extends PureComponent {
  constructor(props) {
    super(props);

    this.id = 'checkbox_' + counter;
    counter++;
  }

  render() {
    const {onChange, children, value} = this.props;
    return (
      <div className={styles.checkbox}>
        <input
          checked={value}
          className={styles.checkboxInput}
          id={this.id}
          type="checkbox"
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={this.id}>{children}</label>
      </div>
    )
  }
}