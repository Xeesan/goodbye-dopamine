import { getLang } from './i18n';

export interface Quote {
  text: string;
  author: string;
}

export const QUOTES_EN: Quote[] = [
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
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
];

export const QUOTES_BN: Quote[] = [
  { text: "তুমি যদি সূর্যের মতো উজ্জ্বল হতে চাও, তাহলে প্রথমে সূর্যের মতো পুড়তে শেখো।", author: "এ.পি.জে আব্দুল কালাম" },
  { text: "স্বপ্ন সেটা নয় যেটা তুমি ঘুমিয়ে দেখো, স্বপ্ন সেটা যেটা তোমাকে ঘুমাতে দেয় না।", author: "এ.পি.জে আব্দুল কালাম" },
  { text: "জীবন হলো সাইকেল চালানোর মতো। ভারসাম্য রাখতে হলে তোমাকে চলতে হবে।", author: "আলবার্ট আইনস্টাইন" },
  { text: "শিক্ষা হলো সবচেয়ে শক্তিশালী অস্ত্র যা দিয়ে তুমি পৃথিবী বদলাতে পারো।", author: "নেলসন ম্যান্ডেলা" },
  { text: "জ্ঞান অর্জনের জন্য প্রয়োজনে চীন পর্যন্ত যাও।", author: "ইমাম আল-গাজ্জালী" },
  { text: "পরিশ্রম সৌভাগ্যের প্রসূতি।", author: "বাংলা প্রবাদ" },
  { text: "যে পরিশ্রম করে, সাফল্য তার কাছেই আসে।", author: "বাংলা প্রবাদ" },
  { text: "আজকের কাজ আজই করো, কালের উপর ভরসা করো না।", author: "বাংলা প্রবাদ" },
  { text: "থেমে যাওয়া মানে হেরে যাওয়া নয়, থেমে গিয়ে আবার শুরু করা মানে জিতে যাওয়া।", author: "অজানা" },
  { text: "ব্যর্থতা মানে হেরে যাওয়া নয়, ব্যর্থতা মানে এখনও শেখা হয়নি।", author: "অজানা" },
  { text: "যে গাছ ঝড়ে টিকে থাকে, সে গাছের শেকড় গভীর।", author: "বাংলা প্রবাদ" },
  { text: "ধৈর্য ধরো, সাফল্য আসবেই।", author: "বাংলা প্রবাদ" },
  { text: "জ্ঞানের শুরু হলো নিজেকে চেনা, আর নিজেকে চেনার শুরু হলো নিজের অজ্ঞতা স্বীকার করা।", author: "ইমাম আল-গাজ্জালী" },
  { text: "যে ব্যক্তি নিজেকে জয় করতে পারে, সে-ই সবচেয়ে শক্তিশালী।", author: "সুলতান সালাহউদ্দিন আইয়ুবী" },
  { text: "মানুষ তার স্বপ্নের সমান বড়।", author: "এ.পি.জে আব্দুল কালাম" },
  { text: "চেষ্টা করলে কেষ্টা মেলে।", author: "বাংলা প্রবাদ" },
  { text: "অসম্ভব বলে কিছু নেই, অসম্ভব শব্দটা শুধু বোকারা ব্যবহার করে।", author: "মুহাম্মদ আলী" },
  { text: "সন্তুষ্ট হৃদয়ই সবচেয়ে বড় সম্পদ।", author: "ইমাম আলী (রা.)" },
  { text: "একটু একটু করে শেখো, একদিন সবকিছু জানবে।", author: "অজানা" },
  { text: "যার মধ্যে শেখার আগ্রহ আছে, তাকে কেউ থামাতে পারে না।", author: "অজানা" },
  { text: "সময় এবং স্রোত কারো জন্য অপেক্ষা করে না।", author: "বাংলা প্রবাদ" },
  { text: "কঠিন সময়ে যে হাল ছাড়ে না, জয় তারই হয়।", author: "অজানা" },
  { text: "প্রতিটি সকাল একটি নতুন সুযোগ।", author: "অজানা" },
  { text: "জ্ঞানীর কলম শহীদের রক্তের চেয়েও পবিত্র।", author: "ইমাম আল-গাজ্জালী" },
  { text: "ভুল থেকে শিখে যে এগিয়ে যায়, সে-ই সত্যিকারের জয়ী।", author: "অজানা" },
  { text: "পড়ো, শেখো, বদলে যাও।", author: "অজানা" },
  { text: "যে জাতি শিক্ষিত, সে জাতি উন্নত।", author: "বাংলা প্রবাদ" },
  { text: "ধৈর্য হলো বিশ্বাসের অর্ধেক।", author: "ইমাম ইবনুল কাইয়িম" },
  { text: "ছোট ছোট পদক্ষেপই বড় গন্তব্যে পৌঁছে দেয়।", author: "অজানা" },
  { text: "হার মানা সহজ, কিন্তু জিতে যাওয়ার স্বাদই আলাদা।", author: "অজানা" },
  { text: "সফলতা কোনো গন্তব্য নয়, এটি একটি যাত্রা।", author: "অজানা" },
  { text: "তুমি পারবে — এটাই সবচেয়ে বড় শক্তি।", author: "অজানা" },
  { text: "যতবার পড়বে, ততবার উঠে দাঁড়াও।", author: "বাংলা প্রবাদ" },
  { text: "জীবনে সবচেয়ে বড় ভুল হলো ভুল করার ভয়ে কিছু না করা।", author: "অজানা" },
  { text: "জ্ঞান ছাড়া আমল অর্থহীন, আর আমল ছাড়া জ্ঞান বোঝাস্বরূপ।", author: "ইমাম আল-গাজ্জালী" },
  { text: "তোমার শত্রুর বিরুদ্ধে সবচেয়ে বড় প্রতিশোধ হলো নিজেকে উন্নত করা।", author: "উমর ইবনুল খাত্তাব (রা.)" },
  { text: "পৃথিবীতে যত মহান কাজ হয়েছে, সব একসময় অসম্ভব মনে হয়েছিল।", author: "অজানা" },
  { text: "লেখাপড়া করে যে, গাড়িঘোড়া চড়ে সে।", author: "বাংলা প্রবাদ" },
  { text: "আত্মবিশ্বাস হলো সাফল্যের প্রথম ধাপ।", author: "অজানা" },
  { text: "মানুষের মূল্য তার জ্ঞান ও চরিত্রে, তার সম্পদে নয়।", author: "ইমাম আলী (রা.)" },
  { text: "যে নিজের রাগকে নিয়ন্ত্রণ করতে পারে, সে-ই প্রকৃত বীর।", author: "উমর ইবনুল খাত্তাব (রা.)" },
  { text: "দুনিয়া হলো আখিরাতের শস্যক্ষেত্র।", author: "ইমাম আল-গাজ্জালী" },
];

// Keep backward compat
export const QUOTES = QUOTES_EN;

function getQuoteList(): Quote[] {
  return getLang() === 'bn' ? QUOTES_BN : QUOTES_EN;
}

export function getDailyQuote(): Quote {
  const quotes = getQuoteList();
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return quotes[dayOfYear % quotes.length];
}

let currentQuoteIndex = -1;

export function getRandomQuote(): Quote {
  const quotes = getQuoteList();
  let idx;
  do {
    idx = Math.floor(Math.random() * quotes.length);
  } while (idx === currentQuoteIndex && quotes.length > 1);
  currentQuoteIndex = idx;
  return quotes[idx];
}
