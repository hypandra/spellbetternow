import type { SpellingTheme } from '../contexts/SpellingThemeContext';

type ThemeContent = {
  label: string;
  themeIcon: string;
  playIcon: string;
  correctFeedback: string;
  incorrectFeedback: string;
  listenPlaceholder: string;
  buttons: {
    start: string;
    startPracticeSet: string;
    keepGoing: string;
    practiceMissed: string;
    harderSet: string;
    finishSession: string;
    backToSpelling: string;
    backToHome: string;
    replay: string;
    submit: string;
    undo: string;
    clear: string;
    addKid: string;
    cancelAddKid: string;
    createKid: string;
    startSession: string;
    viewProgress: string;
  };
};

export const THEME_CONTENT: Record<SpellingTheme, ThemeContent> = {
  focus: {
    label: 'Focus',
    themeIcon: '',
    playIcon: '▶',
    correctFeedback: 'Correct.',
    incorrectFeedback: 'The correct spelling is:',
    listenPlaceholder: 'Press {icon} to hear the word',
    buttons: {
      start: 'Begin',
      startPracticeSet: 'Start Practice',
      keepGoing: 'Continue Practicing',
      practiceMissed: 'Practice Words to Learn',
      harderSet: 'More Challenging Words',
      finishSession: 'Finish Practice',
      backToSpelling: 'Home',
      backToHome: 'Home',
      replay: 'Listen Again',
      submit: 'Check Spelling',
      undo: 'Undo',
      clear: 'Clear Answer',
      addKid: 'Add Learner',
      cancelAddKid: 'Cancel',
      createKid: 'Add',
      startSession: 'Begin',
      viewProgress: 'Progress',
    },
  },
};

export const SPELLING_THEME_OPTIONS = (['focus'] as SpellingTheme[]).map(theme => ({
  theme,
  label: THEME_CONTENT[theme].label,
  icon: THEME_CONTENT[theme].themeIcon,
}));
