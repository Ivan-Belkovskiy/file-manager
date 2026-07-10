export const getWordEndingByNumber = (n: number, word?: string) => {
    const str = String(n);
    if (Number(str[str.length - 1]) === 1) return `${word}`;
    if ([2, 3, 4].includes(Number(str[str.length - 1]))) return `${word}а`;

    return `${word}ов`;
    
}