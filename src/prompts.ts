import * as readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

export function closePrompt(): void {
  rl.close();
}

export async function confirm(
  message: string,
  defaultNo = true,
): Promise<boolean> {
  const hint = defaultNo ? '[y/N]' : '[Y/n]';
  const answer = await prompt(`${message} ${hint} `);

  if (answer === '') {
    return !defaultNo;
  }

  return answer.toLowerCase() === 'y';
}

export async function select<T extends string>(
  message: string,
  options: { label: string; value: T }[],
  defaultIndex = 0,
): Promise<T> {
  console.log(message);
  console.log('');

  for (let i = 0; i < options.length; i++) {
    const marker = i === defaultIndex ? '>' : ' ';
    console.log(`  ${marker} ${i + 1}) ${options[i].label}`);
  }

  console.log('');
  const answer = await prompt(
    `Enter choice [1-${options.length}] (default: ${defaultIndex + 1}): `,
  );

  if (answer === '') {
    return options[defaultIndex].value;
  }

  const index = Number.parseInt(answer, 10) - 1;
  if (index >= 0 && index < options.length) {
    return options[index].value;
  }

  console.log(`Invalid choice. Using default: ${options[defaultIndex].label}`);
  return options[defaultIndex].value;
}
