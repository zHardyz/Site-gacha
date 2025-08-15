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
        spinsLeftElement.textContent = `Invocações restantes: ${spinsLeft}/10`;
        if (spinsLeft === 1) {
            spinsLeftElement.classList.add('pulse');
        } else {
            spinsLeftElement.classList.remove('pulse');
        }
        
        // Atualizar estado do botão imediatamente
        const isDisabled = spinsLeft <= 0;
        summonButton.disabled = isDisabled;
        
        if (isDisabled) {
            summonButton.style.opacity = '0.5';
            summonButton.style.cursor = 'not-allowed';
            summonButton.textContent = 'Sem Invocações';
        } else {
            summonButton.style.opacity = '1';
            summonButton.style.cursor = 'pointer';
            summonButton.textContent = 'Invocar';
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

    function canSpin() {
        return spinsLeft > 0;
    }

    function handleSpin() {
        if (spinsLeft > 0) {
            spinsLeft--;
            localStorage.setItem('spinsLeft', spinsLeft);
            updateSpinsUI();
            
            // Verificar se chegou a zero e bloquear imediatamente
            if (spinsLeft <= 0) {
                summonButton.disabled = true;
                summonButton.style.opacity = '0.5';
                summonButton.style.cursor = 'not-allowed';
                summonButton.textContent = 'Sem Invocações';
            }
            return true;
        }
        return false;
    }

    // summonButton.addEventListener('click', handleSpin);

    window.handleSpin = handleSpin;
    window.canSpin = canSpin;

    updateSpinsUI();
    setInterval(updateCountdown, 1000);
});