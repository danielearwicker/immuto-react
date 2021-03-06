import * as React from "react";
import { Cursor, ReducerBuilder, ReducerOrProvider, Replace, builder, getReducer, amend, assign, action } from "immuto";

export type PolymorphicTypeMethods<S, A, P> = {
    reduce(state: S, action: A): S;
    render(props: P & { binding: Cursor<S, A> }): JSX.Element;
}

export type Polymorph<S, A, P> = S & { polymorphicType: PolymorphicTypeMethods<S, A, P> };

export function render<S, A, P>(props: P & { binding: Cursor<Polymorph<S, A, P>, A> }) {
    return props.binding.state.polymorphicType.render(props);
}

function stub<S, A, P>(emptyState: S): Polymorph<S, A, P> {        
    const reduce = (state: S, action: A) => state;
    const render = (props: {}) => undefined! as JSX.Element;
    return amend(emptyState, { polymorphicType: { reduce, render } });
}

export interface PolymorphFactory<S, A, P, DS, DA> {     
    (init: DS): Polymorph<S, A, P>;
    isInstance(possibleInstance: Polymorph<any, any, P>): possibleInstance is Polymorph<DS, DA, P>;
    isCursor(possibleCursor: Cursor<Polymorph<any, any, P>, any>): possibleCursor is Cursor<Polymorph<DS, DA, P>, DA>;
};

export interface PolymorphDefinition<S, A, P> {
    empty: Polymorph<S, A, P>;
    reduce: ReducerBuilder<Polymorph<S, A, P>, A | Replace<Polymorph<S, A, P>>>;

    derive<DS, DA>(
        derivedProvider: ReducerOrProvider<DS & S, DA | A>,
        derivedRenderer: (props: P & { binding: Cursor<DS & S, DA | A> }) => JSX.Element
    ): PolymorphFactory<S, A, P, DS & S, DA | A>;

    polymorphType: Polymorph<S, A, P>;
    cursorType: Cursor<Polymorph<S, A, P>, A | Replace<Polymorph<S, A, P>>>;

    props<P2>(): PolymorphDefinition<S, A, P2>;
}

function defineWithProps<S, A, P>(
    reducerOrProvider: ReducerOrProvider<S, A>
): PolymorphDefinition<S, A, P> {

    const plainReducer = getReducer(reducerOrProvider);

    const empty = stub<S, A, P>(plainReducer.empty);

    const reducer = (state: Polymorph<S, A, P>, action: A): Polymorph<S, A, P> => { 
        if (state === undefined) {
            state = empty;
        }

        return amend(state.polymorphicType.reduce(state, action),
                { polymorphicType: state.polymorphicType });
    }

    const reduce = builder(empty, reducer).action(action("REPLACE", 
        (s: Polymorph<S, A, P>, v: Polymorph<S, A, P>) => v));
 
    function derive<DS, DA>(                    
        derivedProvider: ReducerOrProvider<DS & S, DA | A>,
        derivedRenderer: (props: P & { binding: Cursor<DS & S, DA | A> }) => JSX.Element
    ): PolymorphFactory<S, A, P, DS & S, DA | DA> {
        
        const derivedReducer = getReducer(derivedProvider);

        const polymorphicType: PolymorphicTypeMethods<S, A, P> = {

            reduce(state: S, action: A): S {
                return wrap(derivedReducer(state as DS & S, action));
            },

            render(props: P & { binding: Cursor<S, A> }) {
                return derivedRenderer(props as (P & { binding: Cursor<DS & S, DA | A> }));
            }
        };

        function wrap(state: DS & S): Polymorph<S, A, P> {
            return amend(state, { polymorphicType });
        }

        function isInstance(possibleInstance: Polymorph<any, any, P>): possibleInstance is Polymorph<DS & S, DA | A, P> {            
            return possibleInstance.polymorphicType as any === polymorphicType;
        }

        function isCursor(possibleCursor: Cursor<Polymorph<any, any, P>, any>): possibleCursor is Cursor<Polymorph<DS & S, DA | A, P>, DA | A> {
            return possibleCursor.state.polymorphicType as any === polymorphicType;
        }

        return assign(wrap, { isInstance, isCursor });
    }

    return {
        empty,
        reduce,
        derive,
        polymorphType: undefined! as Polymorph<S, A, P>,
        cursorType: undefined! as Cursor<Polymorph<S, A, P>, A>,
        props<P2>() {
            return defineWithProps<S, A, P2>(reducerOrProvider);
        }
    };
}

export function polymorph<S, A>(
    reducerOrProvider: ReducerOrProvider<S, A>
): PolymorphDefinition<S, A, {}> {
    return defineWithProps<S, A, {}>(reducerOrProvider);
}
