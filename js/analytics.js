document.addEventListener('DOMContentLoaded', ()=> {
  const next = document.getElementById('btn-next');
  const gen = document.getElementById('btn-generate');
  const save = document.getElementById('btn-save');
  const themeL = document.getElementById('themeLight');
  const themeD = document.getElementById('themeDark');
  const themeA = document.getElementById('themeAuto');
  if(next) next.addEventListener('click', ()=> Analytics.track('next_affirmation'));
  if(gen) gen.addEventListener('click', ()=> Analytics.track('generate_affirmation'));
  if(save) save.addEventListener('click', ()=> Analytics.track('save_affirmation'));
  if(themeL) themeL.addEventListener('click', ()=> Analytics.track('theme_light'));
  if(themeD) themeD.addEventListener('click', ()=> Analytics.track('theme_dark'));
  if(themeA) themeA.addEventListener('click', ()=> Analytics.track('theme_auto'));
});