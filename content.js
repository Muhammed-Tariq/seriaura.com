/* Replace the sample copy and add your own media here. Paths are relative to index.html.
   Every Polaroid and card accepts { type: 'image' | 'video', src, alt, poster }.
   Videos use native playback controls. Empty src values retain the reference's blank frames.
   Example: { type: 'video', src: 'assets/a-moment.mp4', poster: 'assets/a-moment.jpg', alt: 'A moment by the sea' }
*/
window.siteContent = {
  polaroids: Array.from({ length: 7 }, (_, index) => ({ type: 'image', src: '', alt: `Photograph ${index + 1}` })),
  cards: [
    {
      title: 'On dying',
      description: 'Random Substack post description, probably something super existential, or not, I’m just adding loads and loads of words to fill up the empty space in this description; please will it end already? Thank God.',
      media: { type: 'image', src: 'assets/portrait.png', alt: 'Seri smiling' },
      href: ''
    },
    { title: '', description: '', media: { type: 'video', src: '', alt: '' }, href: '' }
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
