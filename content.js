/* EDITING: each photo has its own position. x/y are percentages of its gallery;
   width/height are frame sizes in design pixels; rotation is degrees.
   gallery: 'opening' is the single right-hand collage.
   Change these values to move photos without moving text, sections or the ribbon.
   Optional crop: '50% 35%' changes the focal point inside the frame.
   cropBox: [left, top, width, height] selects a rectangle in source percentages.
   See README.md for examples and the gallery's page position. */
window.siteContent = {
  // Explicit UK offsets keep these instants correct for visitors in every time zone.
  time: {
    birth: '2008-04-09T07:00:00+01:00',
    gapStart: '2026-06-18T00:00:00+01:00',
    // Include the whole of 30 September in the gap year.
    gapEnd: '2027-10-01T00:00:00+01:00',
    events: [
      {id: 'tmua', name: 'TMUA', at: '2026-10-12T13:00:00+01:00',
        logo: 'assets/events/tmua.svg', href: 'https://esat-tmua.ac.uk/about-the-tests/tmua-test/'},
      {id: 'bath', name: 'Bath Half', at: '2027-03-14T10:30:00+00:00',
        logo: 'assets/events/bath.svg', href: 'https://www.londonmarathonevents.co.uk/bath-half'},
      {id: 'brighton', name: 'Brighton Marathon', at: '2027-04-04T09:45:00+01:00', provisional: true,
        logo: 'assets/events/brighton.svg', href: 'https://www.londonmarathonevents.co.uk/brighton-marathon-weekend/brighton-marathon',
        source: 'https://www.letsdothis.com/gb/e/2027-brighton-marathon-weekend-244393?occurrenceId=21111174386'},
      {id: 'ironman', name: 'IRONMAN Wales', at: null,
        logo: 'assets/events/ironman-wales.png', href: 'https://www.ironman.com/races/im-wales'},
      {id: 'oxford', name: 'Oxford Interview', at: null,
        logo: 'assets/events/oxford.svg', href: 'https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews'}
    ]
  },
  // 'warped' gently skews the lettering with compact rows and natural letter height.
  // Set to 'spacing' to restore the previous, unchanged-lettering version.
  ribbonStyle: 'warped',
  // 'together' moves every row down the desktop curve (leftwards on mobile).
  // Set to 'alternating' to restore the previous opposite-direction movement.
  ribbonMovement: 'together',
  // Independent HTML fields for the two curved reading areas; no automatic copies.
  continuationCopy: [
    "I'm currently on a <a href='https://www.youtube.com/watch?v=eKFjWR7X5dU'>gap year</a> — something I'm using as an excuse to say yes to everything. I chose to do so because, over the span of my entire life, being able to guarantee a year of freedom and enjoyment seems like far too promising a deal to pass on. I've also done so because I've experienced an incessant<sup data-footnote='I strongly resonated with the feeling that, right after one really important setback or event had occurred (one salient enough in whatever emotion it takes up to warrant a decent break), I had no time to recover and had to immediately put it all into the back of my mind to focus on the next thing coming at me. This was an awful, pervasive feeling, lasting through to the end of school.'></sup> volley of setbacks over the past year, and I see this year as an opportunity to do all the things I previously wasn't able to, and then some. Some of my more ambitious goals include completing <a href='https://www.ironman.com/races/im-wales'>Ironman Wales</a>,<sup data-footnote='As an intermediate goal, I&#39;m planning to complete an Olympic triathlon in late 2026, and an Ironman 70.3 (likely Weymouth) during the summer. If you can, hold me to this.'></sup> hosting a game of <a href='https://www.youtube.com/@jetlagthegame'>Jet Lag</a> across the UK, running the Brighton Marathon in under 3 hours, and doing some technical AI safety research. I value most the prospect of having loads of fun, though, and the vast majority of the activities I'm undertaking pursue this as an end. I strongly believe that this has a sort of positive feedback loop that does wonders for me in so many other facets of life, not least because I'm young and neuroplastic.<br><br>Right now, my favourite song is <a href='https://www.youtube.com/watch?v=Vsy1URDYK88'>Language</a> by <a href='https://www.youtube.com/channel/UCKKKYE55BVswHgKihx5YXew'>Porter Robinson</a>. I formerly looped Koncept's <a href='https://www.youtube.com/watch?v=AStGWpMKXoA'>remix</a> (which is at such a faster pace than the original now that I've become really accustomed to it), and it took me a while to discover how emotional this song really was. It evokes so strongly the feeling of preparing to start something hard, something meaningful; the feeling of having spent months or years on an work of ineffable importance and its emotionally charged release. There's a strong element of nostalgia, too; some say this is too reminiscent of 2016 Roblox tycoon music for their liking, but for those who don't, it's some of the most euphoric, melancholy-laden music one could ever hear. I (non-exhaustively) also listen to Japanese death metal, depressive breakcore, atmospheric drum-and-bass, J-pop, vocaloid, alternative rock, heavy metal, and <a href='https://www.youtube.com/watch?v=iFV1KDRgIp0'>white girl music</a>.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sem neque, fermentum consequat tincidunt a, blandit vel ipsum. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. <br><br>Nullam vulputate ante in odio vestibulum consequat. Ut sed quam nec eros vestibulum imperdiet. In id porttitor elit. Integer eu est urna. Suspendisse laoreet facilisis tellus, at condimentum mauris malesuada vitae. Aenean elementum nunc nisl, et porta metus pretium at. Fusce id quam ullamcorper, tempor purus non, ullamcorper lorem. Duis et mollis sapien. Duis sed mauris et dui finibus condimentum. Integer sit amet risus nisl. Vestibulum id lectus pharetra, congue ligula vel, fringilla massa. Praesent orci ex, commodo ac feugiat vitae, congue id odio. Mauris pulvinar consequat aliquet. Etiam id ornare risus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sem neque, fermentum consequat tincidunt a, blandit vel ipsum. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. <br><br>Nullam vulputate ante in odio vestibulum consequat. Ut sed quam nec eros vestibulum imperdiet. In id porttitor elit. Integer eu est urna. Suspendisse laoreet facilisis tellus, at condimentum mauris malesuada vitae. Aenean elementum nunc nisl, et porta metus pretium at. Fusce id quam ullamcorper, tempor purus non, ullamcorper lorem. Duis et mollis sapien. Duis sed mauris et dui finibus condimentum. Integer sit amet risus nisl. Vestibulum id lectus pharetra, congue ligula vel, fringilla massa. Praesent orci ex, commodo ac feugiat vitae, congue id odio. Mauris pulvinar consequat aliquet. Etiam id ornare risus. "],
  polaroids: [
    { id: 'loch', gallery: 'opening', src: 'assets/photos/IMG_1187.webp', alt: 'Hills and houses around a loch', x: 57.917, y: 2, width: 143, height: 169, rotation: 12 },
    { id: 'orange-hat', gallery: 'opening', src: 'assets/photos/IMG_0710.webp', alt: 'An orange top hat and heart-shaped glasses', x: -10, y: 20, width: 171, height: 205, rotation: 8, cropBox: [16, 12, 65, 58] },
    { id: 'lighthouse', gallery: 'opening', src: 'assets/photos/IMG_1276.webp', alt: 'A lighthouse seen from the road', x: 62.083, y: 9.717, width: 164, height: 191, rotation: -6 },
    { id: 'window', gallery: 'opening', src: 'assets/photos/IMG_1808.webp', alt: 'An open window in a sunlit yellow building', x: 63, y: 17.925, width: 192, height: 210, rotation: 7 },
    { id: 'cliffs', gallery: 'opening', src: 'assets/photos/IMG_1544.webp', alt: 'Sunset above white cliffs', x: 63.958, y: 27.358, width: 162, height: 195, rotation: -10 },
    { id: 'life-chart', gallery: 'opening', src: 'assets/photos/IMG_1031.webp', alt: 'The hand-drawn SIRI LIFE chart', x: 5.0, y: 42.453, width: 300, height: 234, rotation: -4, cropBox: [10, 10, 85, 80], layer: 2 },
    { id: 'sunset', gallery: 'opening', src: 'assets/photos/IMG_1796.webp', alt: 'Photographing a sunset over fields', x: 65.625, y: 45.943, width: 150, height: 150, rotation: 7 },
    { id: 'dune', gallery: 'opening', src: 'assets/photos/IMG_1587.webp', alt: 'A game of Dune around the table', x: 7.917, y: 52.123, width: 190, height: 263, rotation: -8, cropBox: [13, 11, 81, 76] },
    { id: 'research', gallery: 'opening', src: 'assets/photos/IMG_1582.webp', alt: 'Presentation notes and a research paper on screen', x: 52.917, y: 53.066, width: 210, height: 190, rotation: -5 },
    { id: 'paint', gallery: 'opening', src: 'assets/photos/IMG_1657.webp', alt: 'Friends after a colourful afternoon', x: 2.917, y: 62.5, width: 280, height: 209, rotation: -6, cropBox: [11, 33, 83, 67], layer: 2 },
    { id: 'mirror', gallery: 'opening', src: 'assets/photos/IMG_1628.webp', alt: 'A selfie in an ornate museum mirror', x: 65.0, y: 61.321, width: 164, height: 200, rotation: 8, crop: '50% 35%' },
    { id: 'park', gallery: 'opening', src: 'assets/photos/IMG_1396.webp', alt: 'A group of friends beneath the trees', x: 5.833, y: 71.462, width: 300, height: 168, rotation: 4, cropBox: [12, 43, 68, 37], layer: 2 },
    { id: 'childhood-hat', gallery: 'opening', src: 'assets/photos/aa4b3511-9190-45ef-b35b-b3c6972f94e5.webp', alt: 'A childhood portrait in a suit and wide-brimmed hat', x: 24, y: 19, width: 190, height: 246, rotation: -5, cropBox: [7, 15, 73, 70] },
    { id: 'tube-sign', gallery: 'opening', src: 'assets/photos/IMG_1912.webp', alt: 'A Brixton train display announcing severe delays with a row of question marks', x: 3.750, y: 12, width: 264, height: 159, rotation: 4, cropBox: [12, 43, 68, 39] },
    { id: 'race-start', gallery: 'opening', src: 'assets/photos/IMG_1922.webp', alt: 'Runners gathering beneath the Vitality London 10,000 start arch', x: 58.333, y: 69.575, width: 190, height: 180, rotation: -6, cropBox: [10, 32, 80, 68] },
    { id: 'birthday', gallery: 'opening', src: 'assets/photos/IMG_1392.webp', alt: 'A birthday crown, party hat and an I love LinkedIn shirt', x: 4.167, y: 31.415, width: 230, height: 226, rotation: -7, cropBox: [8, 3, 83, 92] },
    { id: 'mountains', gallery: 'opening', src: 'assets/photos/IMG_1189.webp', alt: 'Sunlight and cloud over a mountain valley', x: 4.167, y: 2.5, width: 224, height: 205, rotation: -7, cropBox: [0, 12, 100, 88] },
    { id: 'festival-gate', gallery: 'opening', src: 'assets/photos/IMG_0883.webp', alt: 'The colourful Liquicity festival entrance beneath a blue sky', x: 51.458, y: 35.613, width: 220, height: 212, rotation: 6, cropBox: [0, 12, 100, 88] },
    { id: 'liquicity-tent', gallery: 'opening', src: 'assets/photos/IMG_0888.webp', alt: 'Headphones glowing beneath purple lights and the Liquicity sign inside a festival tent', x: 45.417, y: 79.245, width: 250, height: 225, rotation: 5, quarterTurn: -1 },
    { id: 'tent-walk', gallery: 'opening', src: 'assets/photos/IMG_1598.webp', alt: 'Two friends walking across the lawn towards a bell tent at sunset', x: -50, y: 40, width: 240, height: 220, rotation: -5, cropBox: [22, 28, 73, 72] }
  ],
  collections: {
    home: { title: 'For progeny and <em>posterity.</em>', original: true },
    thousings: { title: '<em>Thousings.</em>', paragraphs: [], continuation: '' },
    musings: { title: 'A little <em>wondering.</em>', paragraphs: ['Listening to the world. Feeling the world. Enjoying the world’s many experiences, basking in the glory.'], continuation: 'Small <em>wonders.</em>' },
    tabsings: { title: 'One more <em>song.</em>', paragraphs: ['The songs that stay with us. The sun, the moon, the stars.'], continuation: 'Keep <em>listening.</em>' },
    ramblings: { title: 'A thought, then <em>another.</em>', paragraphs: ['For all the little things. For everything that doesn’t quite fit anywhere else.'], continuation: 'And <em>another.</em>' },
    vibesings: { title: 'Feeling the <em>world.</em>', paragraphs: ['Music, moments, and enjoying the world’s many experiences.'], continuation: 'Stay a <em>while.</em>' }
  }
};
