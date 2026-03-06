// ============================
// Motivational Quotes — Dynamic
// ============================
const QUOTES = [
    { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Your limitation—it's only your imagination.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { text: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn" },
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "What you get by achieving your goals is not as important as what you become.", author: "Zig Ziglar" },
    { text: "The mind is everything. What you think you become.", author: "Buddha" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "The only person you are destined to become is the one you decide to be.", author: "Ralph Waldo Emerson" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
    { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
    { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
    { text: "Knowing is not enough; we must apply. Willing is not enough; we must do.", author: "Johann Wolfgang von Goethe" },
    { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" }
];

let currentQuoteIndex = -1;

function getDailyQuote() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
}

function getRandomQuote() {
    let idx;
    do {
        idx = Math.floor(Math.random() * QUOTES.length);
    } while (idx === currentQuoteIndex && QUOTES.length > 1);
    currentQuoteIndex = idx;
    return QUOTES[idx];
}

function refreshQuote() {
    const q = getRandomQuote();
    const quoteEl = document.getElementById('inspiration-quote-text');
    const authorEl = document.getElementById('inspiration-author-text');
    if (!quoteEl || !authorEl) return;

    // Fade out
    quoteEl.style.opacity = '0';
    authorEl.style.opacity = '0';
    quoteEl.style.transform = 'translateY(8px)';
    authorEl.style.transform = 'translateY(8px)';

    setTimeout(() => {
        quoteEl.textContent = `"${q.text}"`;
        authorEl.textContent = `— ${q.author}`;
        // Fade in
        quoteEl.style.opacity = '1';
        authorEl.style.opacity = '1';
        quoteEl.style.transform = 'translateY(0)';
        authorEl.style.transform = 'translateY(0)';
    }, 300);
}
