document.addEventListener('DOMContentLoaded', () => {

    
    const spinsLeftElement = document.getElementById('spins-left');
    const countdownElement = document.getElementById('countdown-timer');
    const summonButton = document.getElementById('summon-button');

    let spinsLeft = localStorage.getItem('spinsLeft') ? parseInt(localStorage.getItem('spinsLeft')) : 10;
    let resetTime = localStorage.getItem('resetTime') ? parseInt(localStorage.getItem('resetTime')) : getNextResetTime();

    function getNextResetTime() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0).getTime();
    }

    function updateSpinsUI() {
        spinsLeftElement.textContent = `Spins left: ${spinsLeft}/10`;
        if (spinsLeft === 1) {
            spinsLeftElement.classList.add('pulse');
        } else {
            spinsLeftElement.classList.remove('pulse');
        }
        if (spinsLeft === 0) {
            summonButton.disabled = true;
        } else {
            summonButton.disabled = false;
        }
    }

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = resetTime - now;

        if (distance <= 0) {
            spinsLeft = 10;
            resetTime = getNextResetTime();
            localStorage.setItem('spinsLeft', spinsLeft);
            localStorage.setItem('resetTime', resetTime);
            updateSpinsUI();
            countdownElement.style.display = 'none';
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        countdownElement.style.display = 'block';
    }

    function handleSpin() {
        if (spinsLeft > 0) {
            spinsLeft--;
            localStorage.setItem('spinsLeft', spinsLeft);
            updateSpinsUI();
        }
    }

    // summonButton.addEventListener('click', handleSpin);

    window.handleSpin = handleSpin;

    updateSpinsUI();
    setInterval(updateCountdown, 1000);
});