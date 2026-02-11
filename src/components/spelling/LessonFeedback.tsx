'use client';

interface LessonFeedbackProps {
  kidId: string;
  pattern: string;
}

import FeedbackPrompt from './FeedbackPrompt';

const LESSON_OPTIONS = [
  { value: 'helped', label: 'This tip helped', icon: '👍' },
  { value: 'not_helped', label: 'This tip did not help', icon: '👎' },
  { value: 'confusing', label: 'This was confusing', icon: '😕' },
];

export default function LessonFeedback({ kidId, pattern }: LessonFeedbackProps) {
  return (
    <FeedbackPrompt
      prompt="Did this tip make sense?"
      options={LESSON_OPTIONS}
      textInputOn={['not_helped', 'confusing']}
      textPlaceholder="What was confusing or didn't help?"
      endpoint="/api/spelling/lesson-feedback"
      payload={{ kidId, pattern }}
    />
  );
}
