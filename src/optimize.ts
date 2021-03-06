import * as React from "react";

/**
 * Given a react stateless component, we return a ComponentClass
 * which implements shouldComponentUpdate by comparing the values
 * of all the props to see if they've changed.
 *
 * Note that for each prop we call its valueOf method, to ensure
 * we are not comparing the identity of a wrapper for the actual
 * value of importance. Two wrappers may refer to the same value
 * and should be treated as equal.
 *
 * This protocol is obeyed by certain built-in JS types and also
 * by any immuto object with a state property (valueOf returns
 * the state.)
 *
 * Sometimes functions are passed in as props and if they are
 * regenerated this does not imply a change in any value that
 * affects rendering. Hence they should be ignored by the
 * comparison. To cause this, list their prop names in the
 * optional ignore parameter.
 *
 * Aside from this, the comparison is shallow. This will only cause
 * repaint bugs if prop values are not immutable.
 */

function valueOf(value: any) {
    return value === undefined || value === null
        ? value : value.valueOf();
}

export function optimize<Props>(
    statelessComponent: (props: Props) => JSX.Element,
    ignore?: string[]
): React.ComponentClass<Props> {

    const ignoreSet: { [key: string]: boolean } = {};
    if (ignore) {
        for (const str of ignore) {
            ignoreSet[str] = true;
        }
    }

    return class extends React.Component<Props, {}> {

        shouldComponentUpdate(newProps: any) {
            const oldProps = this.props as any;

            return !(Object.keys(newProps).every(oldKey => ignoreSet[oldKey] ||
                    Object.prototype.hasOwnProperty.call(newProps, oldKey)) &&
                Object.keys(newProps).every(key => ignoreSet[key] ||
                    valueOf(newProps[key]) === valueOf(oldProps[key])));
        }

        render() {
            return statelessComponent(this.props);
        }
    }
}
