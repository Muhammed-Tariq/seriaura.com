/* EDITING: desktop collage positions are --collage-x/y in style.css.
   width/height are frame sizes in design pixels; rotation is degrees.
   gallery: 'opening' is the collage; 'closing' is the pair below the final paragraph.
   Change positions and frame sizes without moving the text or ribbon.
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
      {id: 'tmua', name: 'TMUA', at: '2026-10-13T13:00:00+01:00',
        logo: 'assets/events/tmua.svg', href: 'https://esat-tmua.ac.uk/about-the-tests/tmua-test/'},
      {id: 'redemption', name: 'IV Redemption', at: '2027-01-12T00:00:00+00:00'},
      {id: 'absolution', name: 'V Absolution', at: '2027-04-05T00:00:00+01:00'},
      {id: 'bath', name: 'Bath Half', at: '2027-03-14T10:30:00+00:00',
        logo: 'assets/events/bath-stacked.svg', href: 'https://www.londonmarathonevents.co.uk/bath-half'},
      {id: 'brighton', name: 'Brighton Marathon', at: '2027-04-04T09:45:00+01:00',
        logo: 'assets/events/brighton.svg', href: 'https://www.londonmarathonevents.co.uk/brighton-marathon-weekend/brighton-marathon',
        source: 'https://www.letsdothis.com/gb/e/2027-brighton-marathon-weekend-244393?occurrenceId=21111174386'},
      // Race dates confirmed by the organisers; exact start times are not yet published.
      // Date-only countdowns target midnight in the host city's time zone.
      {id: 'ironman', name: 'IRONMAN France', at: '2027-09-12T00:00:00+02:00', dateOnly: true, timeZone: 'Europe/Paris',
        logo: 'assets/events/ironman-france.png', href: 'https://www.ironman.com/races/im-france'},
      {id: 'tallinn', name: 'IRONMAN 70.3 Tallinn', at: '2027-08-08T00:00:00+03:00', dateOnly: true, timeZone: 'Europe/Tallinn',
        logo: 'assets/events/ironman-703-tallinn.png', href: 'https://www.ironman.com/races/im703-tallinn'},
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
  polaroids: [
    { id: 'loch', gallery: 'opening', src: 'assets/photos/IMG_1187.webp', alt: 'Hills and houses around a loch', x: 57.917, y: 2, width: 166, height: 178, rotation: 11 },
    { id: 'orange-hat', gallery: 'closing', src: 'assets/photos/IMG_0710.JPEG', alt: 'A suit with an orange top hat, tie and heart-shaped glasses', x: 0, y: 0, width: 330, height: 543, rotation: 6, cropBox: [20, 13, 56, 67] },
    { id: 'lighthouse', gallery: 'opening', src: 'assets/photos/IMG_1276.webp', alt: 'A lighthouse seen from the road', x: 62.083, y: 9.717, width: 155, height: 188, rotation: 9 },
    { id: 'window', gallery: 'opening', src: 'assets/photos/IMG_1808.webp', alt: 'An open window in a sunlit yellow building', x: 63, y: 17.925, width: 201, height: 245, rotation: -6 },
    { id: 'cliffs', gallery: 'opening', src: 'assets/photos/IMG_1544.webp', alt: 'Sunset above white cliffs', x: 63.958, y: 27.358, width: 252, height: 246, rotation: 8 },
    { id: 'life-chart', gallery: 'opening', src: 'assets/photos/IMG_1031.webp', alt: 'The hand-drawn SIRI LIFE chart', x: 5.0, y: 42.453, width: 360, height: 276, rotation: 7, cropBox: [10, 10, 85, 80], layer: 2 },
    { id: 'sunset', gallery: 'opening', src: 'assets/photos/IMG_1796.webp', alt: 'Photographing a sunset over fields', x: 65.625, y: 45.943, width: 166, height: 178, rotation: -10 },
    { id: 'dune', gallery: 'opening', src: 'assets/photos/IMG_1587.webp', alt: 'A game of Dune around the table', x: 7.917, y: 52.123, width: 208, height: 282, rotation: -7, cropBox: [13, 11, 81, 76] },
    { id: 'paint', gallery: 'opening', src: 'assets/photos/IMG_1657.webp', alt: 'Friends after a colourful afternoon', x: 2.917, y: 62.5, width: 389, height: 284, rotation: -4, cropBox: [11, 33, 83, 67], layer: 2 },
    { id: 'mirror', gallery: 'opening', src: 'assets/photos/IMG_1628.webp', alt: 'A selfie in an ornate museum mirror', x: 65.0, y: 61.321, width: 191, height: 235, rotation: -9, crop: '50% 35%' },
    { id: 'park', gallery: 'opening', src: 'assets/photos/IMG_1396.webp', alt: 'A group of friends beneath the trees', x: 5.833, y: 71.462, width: 355, height: 204, rotation: 4, cropBox: [12, 43, 68, 37], layer: 2 },
    { id: 'childhood-hat', gallery: 'closing', src: 'assets/photos/aa4b3511-9190-45ef-b35b-b3c6972f94e5.JPEG', alt: 'A childhood portrait in a suit and wide-brimmed hat', x: 0, y: 0, width: 300, height: 390, rotation: -7, cropBox: [7, 15, 73, 70], layer: 2 },
    { id: 'tube-sign', gallery: 'opening', src: 'assets/photos/IMG_1912.webp', alt: 'A Brixton train display announcing severe delays with a row of question marks', x: 3.750, y: 12, width: 302, height: 182, rotation: -5, cropBox: [12, 43, 68, 39] },
    { id: 'race-start', gallery: 'opening', src: 'assets/photos/IMG_1922.webp', alt: 'Runners gathering beneath the Vitality London 10,000 start arch', x: 58.333, y: 69.575, width: 177, height: 172, rotation: 8, cropBox: [10, 32, 80, 68] },
    { id: 'birthday', gallery: 'opening', src: 'assets/photos/IMG_1392.webp', alt: 'A birthday crown, party hat and an I love LinkedIn shirt', x: 4.167, y: 31.415, width: 195, height: 212, rotation: 10, cropBox: [8, 3, 83, 92] },
    { id: 'mountains', gallery: 'opening', src: 'assets/photos/IMG_1189.webp', alt: 'Sunlight and cloud over a mountain valley', x: 4.167, y: 2.5, width: 332, height: 272, rotation: -8, cropBox: [0, 12, 100, 88] },
    { id: 'festival-gate', gallery: 'opening', src: 'assets/photos/IMG_0883.webp', alt: 'The colourful Liquicity festival entrance beneath a blue sky', x: 51.458, y: 35.613, width: 269, height: 261, rotation: -8, cropBox: [0, 12, 100, 88] },
    { id: 'liquicity-tent', gallery: 'opening', src: 'assets/photos/IMG_0888.webp', alt: 'Headphones glowing beneath purple lights and the Liquicity sign inside a festival tent', x: 45.417, y: 79.245, width: 217, height: 206, rotation: 8, quarterTurn: -1 },
    { id: 'tent-walk', gallery: 'opening', src: 'assets/photos/IMG_1598.webp', alt: 'Two friends walking across the lawn towards a bell tent at sunset', x: -50, y: 40, width: 206, height: 195, rotation: -6, cropBox: [22, 28, 73, 72] }
  ]
};
