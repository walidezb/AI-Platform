import express from 'express';
import { createServer } from 'http';

export function createMockAiServer(port = 8001) {
  const app = express();
  app.use(express.json());

  // Mock assessment start
  app.post('/assessment/start', (req, res) => {
    res.json({
      session_id: `mock-session-${Date.now()}`,
      message:
        'Hello! I am your AI learning consultant. ' +
        "Let's assess your TypeScript skills. " +
        'How many years of experience do you have?',
    });
  });

  // Mock assessment message
  app.post('/assessment/message', (req, res) => {
    const { message } = req.body || {};
    const text = typeof message === 'string' ? message : '';
    const isLastMessage =
      text.toLowerCase().includes('expert') ||
      text.includes('5') ||
      text.includes('10');

    if (isLastMessage) {
      res.json({
        message: 'Thank you! I have a good picture of your skills.',
        isComplete: true,
        skillProfile: {
          strengths: ['TypeScript', 'React', 'Node.js'],
          gaps: ['System Design', 'Performance Optimization'],
          level: 'intermediate',
          recommended: [
            'Advanced TypeScript Patterns',
            'System Design Fundamentals',
          ],
        },
      });
    } else {
      res.json({
        message:
          'Interesting! Can you tell me more about your experience with TypeScript?',
        isComplete: false,
      });
    }
  });

  // Mock path generation
  app.post('/paths/generate', (req, res) => {
    setTimeout(() => {
      res.json({
        path: {
          title: 'Advanced TypeScript Mastery',
          domain: 'Software Engineering',
          estimatedWeeks: 8,
          milestones: [
            {
              title: 'TypeScript Foundations',
              order: 1,
              modules: [
                {
                  title: 'Advanced Types',
                  estimatedMinutes: 45,
                  resources: [
                    {
                      title: 'TypeScript Handbook: Advanced Types',
                      type: 'ARTICLE',
                      url: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html',
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
    }, 500); // simulate 500ms AI latency
  });

  // Mock exercise evaluation
  app.post('/exercises/evaluate', (req, res) => {
    res.json({
      score: 85,
      passed: true,
      feedback:
        'Good understanding of the concept. ' +
        'Consider also mentioning edge cases.',
      details: ['Correct approach', 'Missing error handling'],
    });
  });

  // Health check
  app.get('/health', (_, res) => res.json({ status: 'ok' }));

  const server = createServer(app);
  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.listen(port, resolve);
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
    url: `http://localhost:${port}`,
  };
}
