/* Shared by the review page and the homepage preview. No copy is changed on load. */
(() => {
  const groups=[
    {name:'Quietly purposeful',lines:[
      'There are things about me I’d rather put into words than leave to inference.',
      'I made this website to put a little more of myself on the record.',
      'This is my attempt to leave a less incomplete impression.',
      'I wanted somewhere to say what an introduction leaves out.',
      'There is more I want to make understood than I tend to say aloud.',
      'I made this place to give the things I care about somewhere to live.'
    ]},
    {name:'On being understood',lines:[
      'I’d like to be understood a little more accurately.',
      'This website is an attempt to close the distance between who I am and who I seem to be.',
      'I wanted to give people a better chance of knowing me.',
      'Somewhere between being myself and explaining myself, I made a website.',
      'I’m trying to make myself a little less of a guessing game.',
      'This is what I’d add to the version of me you already know.'
    ]},
    {name:'For posterity',lines:[
      'I wanted to leave something more faithful than a fading impression.',
      'I’m keeping a record of a person who won’t stay quite the same.',
      'Some things about being me feel worth putting somewhere.',
      'I made this website for the things I don’t want time to misremember.',
      'This is a place to keep what being me has felt like.',
      'I’d like there to be something of me here that memory doesn’t have to do all the work for.'
    ]},
    {name:'A little self-aware',lines:[
      'There is a reason for all of this, beyond owning a domain name.',
      'I promise there’s a point to having two personal websites.',
      'An unreasonable amount of thought has gone into being understood.',
      'This website is, among other things, an elaborate attempt to explain myself.',
      'I’ve decided that being perceived should come with supplementary reading.',
      'Consider this a small intervention in whatever impression you have of me.'
    ]},
    {name:'More direct',lines:[
      'I made this website because I care how well we understand one another.',
      'I want this website to make it easier to know me.',
      'I’m here to make a few things about myself clearer.',
      'What follows is an attempt to explain what matters to me, and why.',
      'I wanted a place where I could explain myself at my own pace.',
      'This website is a deliberate attempt to be a little more knowable.'
    ]}
  ];
  const lines=groups.flatMap(group=>group.lines),original="Talking about myself is something I've always found difficult.";
  function preview(index){const target=document.querySelector('#opening-sentence');if(target){target.textContent=Number.isInteger(index)&&index>=0&&index<lines.length?lines[index]:original;window.dispatchEvent(new Event('resize'));}}
  window.OpeningLines={groups,lines,preview,original};
  const value=new URLSearchParams(location.search).get('opening');
  if(value!==null&&/^\d+$/.test(value))preview(Number(value));
})();
