export type SessionState = 'IDLE' | 'IN_MINISET' | 'BREAK' | 'COMPLETE';

export interface SessionStateMachine {
  state: SessionState;
  wordIndex: number;
  transition(action: SessionAction): void;
}

export type SessionAction =
  | { type: 'START' }
  | { type: 'SUBMIT_WORD' }
  | { type: 'REACH_BREAK' }
  | { type: 'CONTINUE' }
  | { type: 'FINISH' };

export class SessionStateMachineImpl implements SessionStateMachine {
  state: SessionState = 'IDLE';
  wordIndex = 0;

  transition(action: SessionAction): void {
    switch (this.state) {
      case 'IDLE':
        if (action.type === 'START') {
          this.state = 'IN_MINISET';
          this.wordIndex = 0;
        }
        break;

      case 'IN_MINISET':
        if (action.type === 'SUBMIT_WORD') {
          this.wordIndex++;
          if (this.wordIndex >= 5) {
            this.state = 'BREAK';
          }
        } else if (action.type === 'REACH_BREAK') {
          this.state = 'BREAK';
        }
        break;

      case 'BREAK':
        if (action.type === 'CONTINUE') {
          this.state = 'IN_MINISET';
          this.wordIndex = 0;
        } else if (action.type === 'FINISH') {
          this.state = 'COMPLETE';
        }
        break;

      case 'COMPLETE':
        break;
    }
  }

  reset(): void {
    this.state = 'IDLE';
    this.wordIndex = 0;
  }
}

