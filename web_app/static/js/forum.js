// ===== Example Data Storage =====
// NOTE: This file contains example data for demonstration purposes
// In production, this would be removed and data would come from the backend API

// Database characters (simulated - these are characters available in the database but not yet created as user accounts)
// In production, this would come from a backend API call
const DATABASE_CHARACTERS = [
    { name: "Harry Potter", fandom: "Harry Potter" },
    { name: "Hermione Granger", fandom: "Harry Potter" },
    { name: "Ron Weasley", fandom: "Harry Potter" },
    { name: "Draco Malfoy", fandom: "Harry Potter" },
    { name: "Severus Snape", fandom: "Harry Potter" },
    { name: "Sherlock Holmes", fandom: "Sherlock Holmes" },
    { name: "John Watson", fandom: "Sherlock Holmes" },
    { name: "Moriarty", fandom: "Sherlock Holmes" },
    { name: "Elizabeth Bennet", fandom: "Pride and Prejudice" },
    { name: "Mr. Darcy", fandom: "Pride and Prejudice" },
    { name: "Jane Bennet", fandom: "Pride and Prejudice" },
    { name: "Luke Skywalker", fandom: "Star Wars" },
    { name: "Princess Leia", fandom: "Star Wars" },
    { name: "Darth Vader", fandom: "Star Wars" },
    { name: "Frodo Baggins", fandom: "The Lord of the Rings" },
    { name: "Gandalf", fandom: "The Lord of the Rings" },
    { name: "Aragorn", fandom: "The Lord of the Rings" }
];

// ===== Example Data Initialization =====
// NOTE: This function initializes example data for demonstration purposes
// In production, this would be removed and data would come from the backend API
function initExampleData() {
    // Check if data already exists
    const existingCharacters = localStorage.getItem('characters');
    const existingForums = localStorage.getItem('forums');
    
    // Only initialize if no data exists
    if (!existingCharacters || JSON.parse(existingCharacters).length === 0) {
        // Example Characters Data
        // NOTE: These are example characters for demonstration
        const exampleCharacters = [
            {
                name: "Harry Potter",
                fandom: "Harry Potter",
                nickname: "TheBoyWhoLived",
                pic: "https://via.placeholder.com/80?text=HP",
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
            },
            {
                name: "Hermione Granger",
                fandom: "Harry Potter",
                nickname: "BrightestWitch",
                pic: "https://via.placeholder.com/80?text=HG",
                createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() // 6 days ago
            },
            {
                name: "Sherlock Holmes",
                fandom: "Sherlock Holmes",
                nickname: "Detective221B",
                pic: "https://via.placeholder.com/80?text=SH",
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
            },
            {
                name: "Elizabeth Bennet",
                fandom: "Pride and Prejudice",
                nickname: "LizzyB",
                pic: "https://via.placeholder.com/80?text=EB",
                createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
            }
        ];
        localStorage.setItem('characters', JSON.stringify(exampleCharacters));
    }
    
    if (!existingForums || JSON.parse(existingForums).length === 0) {
        // Example Forums Data
        // NOTE: These are example forums for demonstration
        const exampleForums = [
            {
                id: "example-forum-1",
                title: "Hogwarts Study Group Discussion",
                status: "published",
                posts: [
                    {
                        characterIndex: 0, // Harry Potter
                        content: "Hey everyone! I was wondering if anyone wants to form a study group for the upcoming O.W.L.s? I think we could all benefit from studying together.",
                        floor: 1,
                        nickname: "TheBoyWhoLived",
                        avatar: "https://via.placeholder.com/80?text=HP"
                    },
                    {
                        characterIndex: 1, // Hermione Granger
                        content: "That's a great idea, Harry! I've already started making study schedules. We could meet in the library three times a week. What subjects should we focus on first?",
                        floor: 2,
                        nickname: "BrightestWitch",
                        avatar: "https://via.placeholder.com/80?text=HG"
                    },
                    {
                        characterIndex: 0, // Harry Potter
                        content: "Thanks Hermione! I think we should start with Defense Against the Dark Arts and Potions. Those are the most challenging for me.",
                        floor: 3,
                        nickname: "TheBoyWhoLived",
                        avatar: "https://via.placeholder.com/80?text=HP"
                    }
                ],
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
                publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "example-forum-2",
                title: "Mystery Case: The Missing Manuscript",
                status: "published",
                posts: [
                    {
                        characterIndex: 2, // Sherlock Holmes
                        content: "Fascinating case, Watson. The manuscript disappeared from a locked room with no signs of forced entry. The only clue is a single strand of hair found near the window.",
                        floor: 1,
                        nickname: "Detective221B",
                        avatar: "https://via.placeholder.com/80?text=SH"
                    },
                    {
                        characterIndex: 2, // Sherlock Holmes
                        content: "After careful analysis, I've deduced that the culprit must have had access to the room key and knowledge of the manuscript's exact location. The hair sample suggests a woman of middle age, likely someone with access to expensive hair products.",
                        floor: 2,
                        nickname: "Detective221B",
                        avatar: "https://via.placeholder.com/80?text=SH"
                    }
                ],
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "example-forum-3",
                title: "Draft: Regency Era Social Commentary",
                status: "draft",
                posts: [
                    {
                        characterIndex: 3, // Elizabeth Bennet
                        content: "I find it quite remarkable how society places such emphasis on marriage and social standing. One's worth should not be determined by their connections or wealth, but by their character and intellect.",
                        floor: 1,
                        nickname: "LizzyB",
                        avatar: "https://via.placeholder.com/80?text=EB"
                    }
                ],
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                publishedAt: null
            }
        ];
        localStorage.setItem('forums', JSON.stringify(exampleForums));
    }
}
