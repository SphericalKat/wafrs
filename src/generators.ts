const randOf = (collection: string) => {
    return () => {
        return collection[Math.floor(Math.random() * collection.length)];
    };
};

// Helper methods to get an random vowel or consonant
const randVowel = randOf('aeiou');
const randConsonant = randOf('bcdfghjklmnpqrstvwxyz');

export default class PhoneticKeyGenerator {

    // Generate a phonetic key of alternating consonant & vowel
    static createKey(keyLength: number) {
        let text = '';
        const start = Math.round(Math.random());

        for (let i = 0; i < keyLength; i++) {
            text += (i % 2 == start) ? randConsonant() : randVowel();
        }

        return text;
    }

};