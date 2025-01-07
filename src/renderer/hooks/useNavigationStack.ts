import { useState, useCallback } from 'react';

interface NavigationState {
  type: string;
  data?: any;
}

export function useNavigationStack() {
  const [stack, setStack] = useState<NavigationState[]>([]);

  const push = useCallback((state: NavigationState) => {
    setStack(prev => [...prev, state]);
  }, []);

  const pop = useCallback(() => {
    if (stack.length === 0) return null;

    const newStack = [...stack];
    const lastState = newStack.pop();
    setStack(newStack);
    return lastState;
  }, [stack]);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  const peek = useCallback(() => {
    if (stack.length === 0) return null;
    return stack[stack.length - 1];
  }, [stack]);

  return {
    push,
    pop,
    clear,
    peek,
    isEmpty: stack.length === 0,
  };
}