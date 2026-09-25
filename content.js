/* EDITING: each photo has its own position. x/y are percentages of its gallery;
   width/height are frame sizes in design pixels; rotation is degrees.
   gallery: 'opening' is the original cluster; 'listening' sits below that ribbon.
   Change these values to move photos without moving text, sections or the ribbon.
   Optional crop: '50% 35%' changes the focal point inside the frame.
   See README.md for examples and the gallery's page position. */
window.siteContent = {
  // Independent HTML fields for the two curved reading areas; no automatic copies.
  continuationCopy: ['', ''],
  substack: {
    snapshot: 'assets/substack-posts.json',
    liveSnapshot: 'https://raw.githubusercontent.com/Muhammed-Tariq/seriaura.com/main/assets/substack-posts.json'
  },
  polaroids: [
    { id: 'orange-hat', gallery: 'opening', src: 'assets/photos/IMG_0710.webp', alt: 'An orange top hat and heart-shaped glasses', x: 4, y: 18.55, width: 171, height: 205, rotation: 8, crop: '50% 28%' },
    { id: 'film', gallery: 'opening', type: 'video', src: 'assets/photos/IMG_0908-loop.mp4', poster: 'assets/photos/IMG_0908-poster.jpg', alt: 'Lights and a crowd at a concert', x: 24, y: 30.39, width: 237, height: 291, rotation: -10 },
    { id: 'support-group', gallery: 'opening', src: 'assets/photos/8a8ac8f3-df0e-4162-ba3c-97312df76f27.webp', alt: 'Late night with friends', x: 31, y: 72.89, width: 146, height: 172, rotation: -8 },
    { id: 'cliffs', gallery: 'opening', src: 'assets/photos/IMG_1544.webp', alt: 'Sunset above white cliffs', x: 3, y: 50.13, width: 162, height: 195, rotation: 8 },
    { id: 'coastal-walk', gallery: 'opening', src: 'assets/photos/IMG_1510.webp', alt: 'Four friends on a coastal walk', x: 65, y: 54.87, width: 162, height: 193, rotation: 2 },
    { id: 'lighthouse', gallery: 'opening', src: 'assets/photos/IMG_1276.webp', alt: 'A lighthouse seen from the road', x: 68, y: 25, width: 164, height: 191, rotation: -6 },
    { id: 'loch', gallery: 'opening', src: 'assets/photos/IMG_1187.webp', alt: 'Hills and houses around a loch', x: 47, y: 5.26, width: 143, height: 169, rotation: 12 },
    { id: 'sunset', gallery: 'listening', src: 'assets/photos/IMG_1796.webp', alt: 'Photographing a sunset over fields', x: 2, y: 2, width: 215, height: 200, rotation: -7 },
    { id: 'window', gallery: 'listening', src: 'assets/photos/IMG_1808.webp', alt: 'An open window in a sunlit yellow building', x: 39, y: 5, width: 192, height: 210, rotation: 5 },
    { id: 'life-chart', gallery: 'listening', src: 'assets/photos/IMG_1031.webp', alt: 'A hand-drawn life chart', x: 8, y: 31, width: 210, height: 190, rotation: 4 },
    { id: 'dune', gallery: 'listening', src: 'assets/photos/IMG_1587.webp', alt: 'A game of Dune around the table', x: 69, y: 9, width: 171, height: 205, rotation: -9 },
    { id: 'research', gallery: 'listening', src: 'assets/photos/IMG_1582.webp', alt: 'Presentation notes and a research paper on screen', x: 45, y: 37, width: 210, height: 190, rotation: -6 },
    { id: 'paint', gallery: 'listening', src: 'assets/photos/IMG_1657.webp', alt: 'Friends after a colourful afternoon', x: 2, y: 66, width: 225, height: 195, rotation: -5 },
    { id: 'mirror', gallery: 'listening', src: 'assets/photos/IMG_1628.webp', alt: 'A selfie in an ornate museum mirror', x: 72, y: 46, width: 164, height: 200, rotation: 8, crop: '50% 35%' },
    { id: 'park', gallery: 'listening', src: 'assets/photos/IMG_1396.webp', alt: 'A group of friends beneath the trees', x: 43, y: 73, width: 225, height: 195, rotation: 6 }
  ],
  collections: {
    home: { title: 'For <em>progeny</em> and <em>posterity.</em>', original: true },
    thousings: { title: '<em>Thousings.</em>', paragraphs: [], continuation: '' },
    musings: { title: 'A little <em>wondering.</em>', paragraphs: ['Listening to the world. Feeling the world. Enjoying the world’s many experiences, basking in the glory.'], continuation: 'Small <em>wonders.</em>' },
    tabsings: { title: 'One more <em>song.</em>', paragraphs: ['The songs that stay with us. The sun, the moon, the stars.'], continuation: 'Keep <em>listening.</em>' },
    ramblings: { title: 'A thought, then <em>another.</em>', paragraphs: ['For all the little things. For everything that doesn’t quite fit anywhere else.'], continuation: 'And <em>another.</em>' },
    vibesings: { title: 'Feeling the <em>world.</em>', paragraphs: ['Music, moments, and enjoying the world’s many experiences.'], continuation: 'Stay a <em>while.</em>' }
  }
};
