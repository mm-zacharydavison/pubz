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

export async function multiSelect<T>(
  message: string,
  options: { label: string; value: T }[],
  allSelectedByDefault = true,
): Promise<T[]> {
  const selected = new Set<number>(
    allSelectedByDefault ? options.map((_, i) => i) : [],
  );

  const printOptions = () => {
    console.log(message);
    console.log('');
    for (let i = 0; i < options.length; i++) {
      const checkbox = selected.has(i) ? '[x]' : '[ ]';
      console.log(`  ${checkbox} ${i + 1}) ${options[i].label}`);
    }
    console.log('');
    console.log('Enter number to toggle, "a" to select all, "n" to select none, or press Enter to confirm:');
  };

  printOptions();

  while (true) {
    const answer = await prompt('> ');

    if (answer === '') {
      break;
    }

    if (answer.toLowerCase() === 'a') {
      for (let i = 0; i < options.length; i++) {
        selected.add(i);
      }
      console.log('');
      printOptions();
      continue;
    }

    if (answer.toLowerCase() === 'n') {
      selected.clear();
      console.log('');
      printOptions();
      continue;
    }

    const index = Number.parseInt(answer, 10) - 1;
    if (index >= 0 && index < options.length) {
      if (selected.has(index)) {
        selected.delete(index);
      } else {
        selected.add(index);
      }
      console.log('');
      printOptions();
    } else {
      console.log('Invalid input. Try again.');
    }
  }

  return options.filter((_, i) => selected.has(i)).map((o) => o.value);
}
