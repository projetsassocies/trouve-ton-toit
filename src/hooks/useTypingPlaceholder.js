import { useState, useEffect, useRef } from 'react';

/**
 * Rotating placeholder with typing/backspacing effect.
 * @param {string[]} prompts - Array of placeholder strings to cycle through
 * @param {number} typingSpeed - ms per character when typing
 * @param {number} backspaceSpeed - ms per character when backspacing
 * @param {number} pauseAfterType - ms to wait after finishing a prompt before backspacing
 * @param {number} pauseAfterBackspace - ms to wait after backspacing before typing next
 */
export function useTypingPlaceholder(
  prompts = [],
  typingSpeed = 50,
  backspaceSpeed = 30,
  pauseAfterType = 2500,
  pauseAfterBackspace = 400
) {
  const [displayText, setDisplayText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [phase, setPhase] = useState('typing'); // 'typing' | 'holding' | 'backspacing' | 'waiting'
  const charIndexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setDisplayText('');
    setPromptIndex(0);
    setPhase('typing');
    charIndexRef.current = 0;
  }, [prompts]);

  useEffect(() => {
    if (!prompts.length) return;

    const currentPrompt = prompts[promptIndex];

    const scheduleNext = (fn, delay) => {
      timeoutRef.current = setTimeout(fn, delay);
    };

    const run = () => {
      if (phase === 'typing') {
        if (charIndexRef.current < currentPrompt.length) {
          charIndexRef.current += 1;
          setDisplayText(currentPrompt.slice(0, charIndexRef.current));
          scheduleNext(run, typingSpeed);
        } else {
          setPhase('holding');
          scheduleNext(run, pauseAfterType);
        }
      } else if (phase === 'holding') {
        setPhase('backspacing');
        scheduleNext(run, 0);
      } else if (phase === 'backspacing') {
        if (charIndexRef.current > 0) {
          charIndexRef.current -= 1;
          setDisplayText(currentPrompt.slice(0, charIndexRef.current));
          scheduleNext(run, backspaceSpeed);
        } else {
          setPhase('waiting');
          setDisplayText('');
          scheduleNext(run, pauseAfterBackspace);
        }
      } else if (phase === 'waiting') {
        setPromptIndex((i) => (i + 1) % prompts.length);
        charIndexRef.current = 0;
        setPhase('typing');
        scheduleNext(run, 0);
      }
    };

    run();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [prompts, promptIndex, phase, typingSpeed, backspaceSpeed, pauseAfterType, pauseAfterBackspace]);

  return displayText;
}
