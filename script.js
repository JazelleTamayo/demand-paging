// DOM Elements
const frontPage = document.getElementById('frontPage');
const mainPage = document.getElementById('mainPage');
const getStartedBtn = document.getElementById('getStartedBtn');
const referenceStringInput = document.getElementById('referenceString');
const numFramesInput = document.getElementById('numFrames');
const algorithmSelect = document.getElementById('algorithm');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const continueBtn = document.getElementById('continueBtn');
const resetBtn = document.getElementById('resetBtn');
const statusBar = document.getElementById('statusBar');
const faultCounter = document.getElementById('faultCounter');
const hitCounter = document.getElementById('hitCounter');
const framesContainer = document.getElementById('framesContainer');
const stepInfo = document.getElementById('stepInfo');

// Globals
let referenceString = [];
let frames = [];
let numFrames = 3;
let algorithm = 'fifo';
let pageFaults = 0;
let pageHits = 0;
let currentStep = -1;
let animationInterval;
let simulationRunning = false;
let fifoQueue = [];
let lruStack = [];

// Event Listeners
getStartedBtn.addEventListener('click', () => {
    frontPage.style.display = 'none';
    mainPage.style.display = 'block';
});

runBtn.addEventListener('click', startSimulation);
stopBtn.addEventListener('click', stopSimulation);
continueBtn.addEventListener('click', continueSimulation);
resetBtn.addEventListener('click', resetSimulation);

// Functions
function startSimulation() {
    // Get and validate inputs
    const inputString = referenceStringInput.value.trim();
    if (!inputString) {
        updateStatus('Error: Please enter a reference string', 'error');
        return;
    }
    
    referenceString = inputString.split(/\s+/).map(Number);
    if (referenceString.some(isNaN)) {
        updateStatus('Error: Reference string must contain only numbers', 'error');
        return;
    }
    
    numFrames = parseInt(numFramesInput.value);
    if (isNaN(numFrames) || numFrames < 1) {
        updateStatus('Error: Number of frames must be at least 1', 'error');
        return;
    }
    
    algorithm = algorithmSelect.value;
    
    // Initialize simulation
    resetSimulation(false);
    simulationRunning = true;
    runBtn.disabled = true;
    stopBtn.disabled = false;
    continueBtn.disabled = true;
    
    updateStatus('Simulation Running...');
    
    // Display the reference string at the top
    displayReferenceString();
    
    // Start animation
    runSimulationStep();
}

function displayReferenceString() {
    // Create a container for the reference string
    const stringContainer = document.createElement('div');
    stringContainer.className = 'reference-string-display';
    stringContainer.style.display = 'flex';
    stringContainer.style.justifyContent = 'center';
    stringContainer.style.gap = '10px';
    stringContainer.style.marginBottom = '20px';
    stringContainer.style.padding = '10px';
    stringContainer.style.backgroundColor = '#f5f5f5';
    stringContainer.style.borderRadius = '4px';
    
    // Add each number as a box
    referenceString.forEach(num => {
        const numBox = document.createElement('div');
        numBox.className = 'reference-number';
        numBox.textContent = num;
        numBox.style.width = '40px';
        numBox.style.height = '40px';
        numBox.style.display = 'flex';
        numBox.style.alignItems = 'center';
        numBox.style.justifyContent = 'center';
        numBox.style.border = '1px solid #ccc';
        numBox.style.borderRadius = '4px';
        numBox.style.backgroundColor = 'white';
        numBox.style.fontWeight = 'bold';
        
        stringContainer.appendChild(numBox);
    });
    
    // Insert at the top of the frames container
    framesContainer.innerHTML = '';
    framesContainer.appendChild(stringContainer);
}

function stopSimulation() {
    simulationRunning = false;
    clearInterval(animationInterval);
    stopBtn.disabled = true;
    continueBtn.disabled = false;
    updateStatus('Simulation Paused');
}

function continueSimulation() {
    simulationRunning = true;
    continueBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus('Simulation Running...');
    runSimulationStep();
}

function resetSimulation(resetInputs = true) {
    simulationRunning = false;
    clearTimeout(animationInterval);
    currentStep = -1;
    pageFaults = 0;
    pageHits = 0;
    frames = Array(numFrames).fill(null);
    fifoQueue = [];
    lruStack = [];
    
    if (resetInputs) {
        referenceStringInput.value = '';
        numFramesInput.value = '3';
        algorithmSelect.value = 'fifo';
    }
    
    faultCounter.textContent = '0';
    hitCounter.textContent = '0';
    framesContainer.innerHTML = '';
    updateStatus('Ready');
    stepInfo.textContent = 'No simulation running';
    
    // Remove any floating pages that might be left over
    const floatingPages = document.querySelectorAll('.floating-page');
    floatingPages.forEach(page => page.remove());
    
    runBtn.disabled = false;
    stopBtn.disabled = true;
    continueBtn.disabled = true;
}

// Add this function to create visual feedback of pages moving between frames
function animatePageMovement(currentPage, targetFrameIndex, isReplacement = false, rowElement) {
    // Get the reference number to animate from
    const referenceElements = document.querySelectorAll('.reference-number');
    if (!referenceElements || currentStep >= referenceElements.length) return;
    
    const sourceElement = referenceElements[currentStep];
    
    // Create a floating element for animation
    const floatingPage = document.createElement('div');
    floatingPage.className = 'floating-page';
    floatingPage.textContent = currentPage;
    document.body.appendChild(floatingPage);
    
    // Find the target frame in the current row
    const frameElements = rowElement.querySelectorAll('.frame');
    if (frameElements.length <= targetFrameIndex) {
        document.body.removeChild(floatingPage);
        return;
    }
    
    const targetFrame = frameElements[targetFrameIndex];
    
    const refRect = sourceElement.getBoundingClientRect();
    const targetRect = targetFrame.getBoundingClientRect();
    
    // Set initial position
    floatingPage.style.position = 'absolute';
    floatingPage.style.top = `${refRect.top}px`;
    floatingPage.style.left = `${refRect.left}px`;
    floatingPage.style.width = `${refRect.width}px`;
    floatingPage.style.height = `${refRect.height}px`;
    floatingPage.style.display = 'flex';
    floatingPage.style.alignItems = 'center';
    floatingPage.style.justifyContent = 'center';
    floatingPage.style.fontWeight = 'bold';
    floatingPage.style.fontSize = '1.2rem';
    floatingPage.style.backgroundColor = isReplacement ? '#f0f0f0' : 'white';
    floatingPage.style.zIndex = '100';
    floatingPage.style.borderRadius = '4px';
    floatingPage.style.transition = 'all 0.6s ease-in-out';
    
    // Highlight the current reference
    sourceElement.style.backgroundColor = '#e6f2ff';
    
    // Trigger animation to target frame
    setTimeout(() => {
        floatingPage.style.top = `${targetRect.top}px`;
        floatingPage.style.left = `${targetRect.left}px`;
        
        // Remove the element after animation completes
        setTimeout(() => {
            document.body.removeChild(floatingPage);
            
            // Reset reference highlight
            setTimeout(() => {
                sourceElement.style.backgroundColor = 'white';
            }, 300);
        }, 700);
    }, 50);
}

function runSimulationStep() {
    if (!simulationRunning) return;
    
    currentStep++;
    
    if (currentStep >= referenceString.length) {
        simulationComplete();
        return;
    }
    
    const currentPage = referenceString[currentStep];
    const framesCopy = [...frames];
    let replacedFrameIndex = -1;
    let stepResult = '';
    let stepExplanation = '';
    
    // Check if page is already in frames (hit)
    const pageIndex = frames.indexOf(currentPage);
    if (pageIndex !== -1) {
        // Page hit
        pageHits++;
        hitCounter.textContent = pageHits;
        stepResult = 'hit';
        stepExplanation = `Page ${currentPage} is already in frame ${pageIndex + 1}`;
        
        // Update LRU stack if using LRU algorithm
        if (algorithm === 'lru') {
            lruStack = lruStack.filter(page => page !== currentPage);
            lruStack.push(currentPage);
        }
    } else {
        // Page fault
        pageFaults++;
        faultCounter.textContent = pageFaults;
        stepResult = 'fault';
        
        // Find a frame to replace
        if (frames.includes(null)) {
            // Empty frame available
            const emptyIndex = frames.indexOf(null);
            frames[emptyIndex] = currentPage;
            stepExplanation = `Page ${currentPage} loaded into empty frame ${emptyIndex + 1}`;
            
            // Create frame row first, then animate after it's in the DOM
            const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult);
            
            // Delay animation so it occurs after the frame row is created
            setTimeout(() => {
                animatePageMovement(currentPage, emptyIndex, false, rowElement);
            }, 200);
            
            // Update tracking structures
            if (algorithm === 'fifo') {
                fifoQueue.push({ page: currentPage, frameIndex: emptyIndex });
            }
            if (algorithm === 'lru') {
                lruStack.push(currentPage);
            }
        } else {
            // Need to replace a page
            if (algorithm === 'fifo') {
                // FIFO replacement
                const oldest = fifoQueue.shift();
                replacedFrameIndex = oldest.frameIndex;
                frames[replacedFrameIndex] = currentPage;
                fifoQueue.push({ page: currentPage, frameIndex: replacedFrameIndex });
                stepExplanation = `Page ${framesCopy[replacedFrameIndex]} in frame ${replacedFrameIndex + 1} replaced with page ${currentPage} (FIFO)`;
                
                // Create frame row first, then animate
                const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult);
                
                setTimeout(() => {
                    animatePageMovement(currentPage, replacedFrameIndex, true, rowElement);
                }, 200);
            } else if (algorithm === 'lru') {
                // LRU replacement
                const leastRecentPage = lruStack.shift();
                replacedFrameIndex = frames.indexOf(leastRecentPage);
                frames[replacedFrameIndex] = currentPage;
                lruStack.push(currentPage);
                stepExplanation = `Page ${framesCopy[replacedFrameIndex]} in frame ${replacedFrameIndex + 1} replaced with page ${currentPage} (LRU)`;
                
                // Create frame row first, then animate
                const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult);
                
                setTimeout(() => {
                    animatePageMovement(currentPage, replacedFrameIndex, true, rowElement);
                }, 200);
            } else if (algorithm === 'optimal') {
                // Optimal replacement
                const futureIndices = frames.map(frame => {
                    const nextOccurrence = referenceString.slice(currentStep + 1).indexOf(frame);
                    return nextOccurrence === -1 ? Infinity : nextOccurrence;
                });
                
                replacedFrameIndex = futureIndices.indexOf(Math.max(...futureIndices));
                frames[replacedFrameIndex] = currentPage;
                stepExplanation = `Page ${framesCopy[replacedFrameIndex]} in frame ${replacedFrameIndex + 1} replaced with page ${currentPage} (Optimal)`;
                
                // Create frame row first, then animate
                const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult);
                
                setTimeout(() => {
                    animatePageMovement(currentPage, replacedFrameIndex, true, rowElement);
                }, 200);
            }
        }
    }
    
    // If we didn't already create the frame row in the replacements, create it now (hits)
    if (pageIndex !== -1 || !simulationRunning) {
        createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult);
    }
    
    // Update step info
    stepInfo.innerHTML = `<strong>Step ${currentStep + 1}:</strong> Referencing Page ${currentPage} - ${stepResult.toUpperCase()} - ${stepExplanation}`;
    
    // Continue to next step after delay
    animationInterval = setTimeout(runSimulationStep, 1500); // Increased delay to account for animations
}

function createFrameRow(currentPage, oldFrames, newFrames, replacedIndex, result) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'frame-row';
    rowDiv.style.display = 'flex';
    rowDiv.style.flexDirection = 'column';
    rowDiv.style.alignItems = 'center';
    rowDiv.style.marginBottom = '20px';
    rowDiv.style.padding = '15px';
    rowDiv.style.backgroundColor = '#f9f9f9';
    rowDiv.style.borderRadius = '8px';
    rowDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    
    // Create frames container (horizontal)
    const framesDiv = document.createElement('div');
    framesDiv.style.display = 'flex';
    framesDiv.style.justifyContent = 'center';
    framesDiv.style.gap = '15px';
    framesDiv.style.marginBottom = '10px';
    
    // Add frames with smoother transitions
    for (let i = 0; i < numFrames; i++) {
        const frameDiv = document.createElement('div');
        frameDiv.className = 'frame';
        
        // Apply empty frame styling
        if (newFrames[i] === null) {
            frameDiv.classList.add('empty-frame');
        }
        
        if (i === replacedIndex) {
            frameDiv.classList.add('replace-highlight');
            // Add animation class for replaced pages
            frameDiv.style.animation = 'replace-animation 0.8s ease-in-out';
        }
        
        frameDiv.textContent = newFrames[i] === null ? '' : newFrames[i];
        
        // If this is a newly added page (not a replacement), add animation class
        if (oldFrames[i] === null && newFrames[i] !== null && i !== replacedIndex) {
            frameDiv.style.animation = 'page-enter 0.8s ease-out';
        }
        
        framesDiv.appendChild(frameDiv);
    }
    
    rowDiv.appendChild(framesDiv);
    
    // Add result (hit/fault) with animation
    const resultDiv = document.createElement('div');
    resultDiv.className = `result ${result}`;
    
    // Show "FAULT" for faults and empty string for hits
    resultDiv.textContent = result === 'fault' ? 'FAULT' : '';
    
    resultDiv.style.opacity = '0';
    resultDiv.style.transform = 'scale(0.8)';
    rowDiv.appendChild(resultDiv);
    
    framesContainer.appendChild(rowDiv);
    
    // Trigger animations with small delays for sequential effect
    setTimeout(() => {
        resultDiv.style.transition = 'all 0.4s ease-out';
        resultDiv.style.opacity = '1';
        resultDiv.style.transform = 'scale(1)';
    }, 300);
    
    rowDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    
    return rowDiv;
}

function simulationComplete() {
    simulationRunning = false;
    clearTimeout(animationInterval);
    runBtn.disabled = false;
    stopBtn.disabled = true;
    continueBtn.disabled = true;
    
    // Calculate hit ratio
    const totalReferences = pageFaults + pageHits;
    const hitRatio = (pageHits / totalReferences) * 100;
    
    updateStatus('Simulation Complete');
    stepInfo.innerHTML = `<strong>Simulation Complete!</strong><br>
                         Total References: ${totalReferences}<br>
                         Page Hits: ${pageHits}<br>
                         Page Faults: ${pageFaults}<br>
                         Hit Ratio: ${hitRatio.toFixed(2)}%`;
}

function updateStatus(message, type = 'info') {
    statusBar.textContent = message;
    
    if (type === 'error') {
        statusBar.style.backgroundColor = '#ffebee';
        statusBar.style.color = '#c62828';
    } else {
        statusBar.style.backgroundColor = '#f0f0f0';
        statusBar.style.color = 'black';
    }
}
