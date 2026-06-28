interface Props {
  question: string;
  answer: React.ReactNode;
}

export function VerdictBanner({ question, answer }: Props) {
  return (
    <div className="verdict-banner">
      <div className="verdict-question">{question}</div>
      <div className="verdict-answer">{answer}</div>
    </div>
  );
}
