'use client';

type FeedbackCategory = 'hide_word' | 'bad_definition' | 'bad_example' | 'bad_audio';

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'hide_word', label: 'Hide this word' },
  { value: 'bad_definition', label: 'Bad definition' },
  { value: 'bad_example', label: 'Bad example sentence' },
  { value: 'bad_audio', label: 'Bad pronunciation' },
];

interface WordFeedbackProps {
  wordId: string;
  kidId: string;
  attemptId: string | null;
}

import FeedbackPrompt from './FeedbackPrompt';

export default function WordFeedback({ wordId, kidId, attemptId }: WordFeedbackProps) {
  return (
    <FeedbackPrompt
      prompt="Something off?"
      options={CATEGORIES}
      textInputOn={CATEGORIES.map((category) => category.value)}
      textPlaceholder="Any details? (optional)"
      endpoint="/api/spelling/word-feedback"
      payload={{ attemptId, wordId, kidId }}
      confirmText="Thanks — we'll review this"
      startOpen={false}
      ratingKey="category"
    />
  );
}
