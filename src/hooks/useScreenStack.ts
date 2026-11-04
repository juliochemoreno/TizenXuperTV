import { useReducer, useCallback } from 'react';
import { Screen, stackReducer } from '../lib/screenStack';

export function useScreenStack() {
  const [stack, dispatch] = useReducer(stackReducer, [{ id: 'home' } as Screen]);
  const push = useCallback((screen: Screen) => dispatch({ type: 'push', screen }), []);
  const pop = useCallback(() => dispatch({ type: 'pop' }), []);
  const replace = useCallback((screen: Screen) => dispatch({ type: 'replace', screen }), []);
  return { stack, top: stack[stack.length - 1], push, pop, replace };
}
