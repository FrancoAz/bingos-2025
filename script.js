// Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const bingoGrids = document.querySelectorAll('.bingo-grid');
const countdowns = document.querySelectorAll('.countdown');
const modal = document.getElementById('confirmationModal');
const closeModalBtn = document.querySelector('.close-modal');
const closeBtn = document.querySelector('.close-btn');
const reservedNumberSpan = document.getElementById('reservedNumber');

// State Management
let selectedNumbers = {
    1: null,
    2: null,
    3: null,
    4: null
};

// Tab Switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Generate Bingo Grids
function generateBingoGrid(gridElement, bingoId) {
    for (let i = 1; i <= 80; i++) {
        const numberButton = document.createElement('button');
        numberButton.classList.add('bingo-number');
        numberButton.textContent = i;
        numberButton.dataset.number = i;
        
        numberButton.addEventListener('click', () => selectBingoNumber(numberButton, bingoId));
        
        gridElement.appendChild(numberButton);
    }
    
    // Load occupied numbers from Firestore
    loadOccupiedNumbers(gridElement, bingoId);
}

// Load occupied numbers from Firestore
function loadOccupiedNumbers(gridElement, bingoId) {
    db.collection(`bingo${bingoId}`)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const occupiedNumber = doc.id;
                const numberButton = gridElement.querySelector(`[data-number="${occupiedNumber}"]`);
                if (numberButton) {
                    numberButton.classList.add('occupied');
                }
            });
        })
        .catch((error) => {
            console.error("Error loading occupied numbers: ", error);
        });
}

// Select Bingo Number
function selectBingoNumber(button, bingoId) {
    // Check if number is already occupied
    if (button.classList.contains('occupied')) {
        return;
    }
    
    const number = button.dataset.number;
    
    // Clear previous selection
    document.querySelectorAll(`.bingo-grid[data-bingo="${bingoId}"] .bingo-number.selected`).forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Select the new number
    button.classList.add('selected');
    selectedNumbers[bingoId] = number;
    
    // Update the form
    const selectedNumberSpan = document.querySelector(`#bingo${bingoId} .selected-number`);
    selectedNumberSpan.textContent = number;
    
    // Enable the submit button
    const submitBtn = document.querySelector(`#bingo${bingoId}Form .submit-btn`);
    submitBtn.disabled = false;
}

// Initialize Bingo Grids
bingoGrids.forEach(grid => {
    const bingoId = grid.getAttribute('data-bingo');
    generateBingoGrid(grid, bingoId);
});

// Handle Form Submissions
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
});

function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const bingoId = form.id.replace('Form', '');
    const number = selectedNumbers[bingoId.slice(-1)];
    
    if (!number) {
        alert('Por favor, selecciona un número para participar.');
        return;
    }
    
    const formData = {
        name: form.querySelector('[name="name"]').value,
        email: form.querySelector('[name="email"]').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    db.collection(bingoId)
        .doc(number)
        .set(formData)
        .then(() => {
            // Mark number as occupied
            const numberButton = document.querySelector(`#${bingoId} .bingo-grid .bingo-number[data-number="${number}"]`);
            numberButton.classList.add('occupied');
            numberButton.classList.remove('selected');
            
            // Reset form
            form.reset();
            
            // Update selected number display
            document.querySelector(`#${bingoId} .selected-number`).textContent = 'Ninguno';
            
            // Disable submit button
            form.querySelector('.submit-btn').disabled = true;
            
            // Clear selected number state
            selectedNumbers[bingoId.slice(-1)] = null;
            
            // Show confirmation modal
            reservedNumberSpan.textContent = number;
            modal.classList.add('show');
        })
        .catch((error) => {
            console.error("Error saving reservation: ", error);
            alert('Hubo un error al reservar el número. Por favor, intenta nuevamente.');
        });
}

// Update Countdowns
function updateCountdowns() {
    countdowns.forEach(countdown => {
        const targetDate = new Date(countdown.getAttribute('data-date')).getTime();
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
            countdown.innerHTML = '<div class="countdown-ended">¡El sorteo ha finalizado!</div>';
            return;
        }
        
        // Calculate days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Update countdown display
        countdown.querySelector('.days').textContent = days.toString().padStart(2, '0');
        countdown.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
        countdown.querySelector('.minutes').textContent = minutes.toString().padStart(2, '0');
        countdown.querySelector('.seconds').textContent = seconds.toString().padStart(2, '0');
    });
}

// Update countdowns every second
setInterval(updateCountdowns, 1000);
updateCountdowns(); // Initial update

// Modal Close Events
closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
});

closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.classList.remove('show');
    }
});

// Smooth Scroll for Navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    });
});

