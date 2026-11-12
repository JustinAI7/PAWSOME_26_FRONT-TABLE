// PAWSOME 2026 front-end settings. Edit this file only.
window.PAWSOME_CONFIG = {
  // Paste the Web app URL you get after deploying Code.gs (ends with /exec)
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwrlM1erVn8SaXWXeKDYBtoxLdvIRiuQ6V2M1XDn_5MSlEFJekpcujRXalbVQKnEBYclA/exec',

  // Logos shown at the top of the pages. The image files sit in the same folder as this file.
  // To add another logo, copy its file next to this one and add a line, for example:
  // { src: 'sponsor-logo.png', alt: 'Sponsor' }
  // Leave the list empty to show no logos.
  LOGOS: [
    { src: 'unorssg-logo.png', alt: 'UNORSSG seal' }
  ],

  // Text shown on the registration page. Keep the keys (kapon, rabies) the same as in Code.gs.
  EVENTS: {
    kapon: {
      title: 'Free Spay and Neuter (Kapon)',
      when: 'Nov 19 (Thursday) · University Auditorium',
      note: 'Up to 2 pets per owner. Limited to 80 pets, first come first served (morning and afternoon batches). Dogs and cats at least 6 months old and healthy.',
      maxPets: 2,
      needsPet: true
    },
    rabies: {
      title: 'Free Anti-Rabies Vaccination',
      when: 'Nov 19 (Thursday) · University Auditorium',
      note: 'Dogs and cats, at least 3 months old and healthy. Up to 2 pets per owner. Check your pet\'s vaccine card first: if the anti-rabies shot has not expired, vaccinating again is not recommended.',
      maxPets: 2,
      needsPet: true
    }
  }
};
