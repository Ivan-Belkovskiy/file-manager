export const getWordEndingByNumber = (n: number, word: string) => {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod100 >= 11 && mod100 <= 14) {
        return `${word}ов`;
    }

    if (mod10 === 1) {
        return `${word}`;
    }

    if ([2, 3, 4].includes(mod10)) {
        return `${word}а`;
    }

    return `${word}ов`;
}