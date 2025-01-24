// Helper function to handle form submissions
async function handleFormSubmit(event, endpoint) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        const responseArea = document.getElementById(form.id.replace('Form', 'Response'));
        responseArea.textContent = JSON.stringify(result, null, 2);
        
        if (!response.ok) {
            responseArea.style.color = 'red';
        } else {
            responseArea.style.color = 'inherit';
        }
    } catch (error) {
        const responseArea = document.getElementById(form.id.replace('Form', 'Response'));
        responseArea.textContent = 'Error: ' + error.message;
        responseArea.style.color = 'red';
    }
}

// Helper function to handle button clicks
async function handleButtonClick(endpoint, responseId) {
    try {
        const response = await fetch(endpoint);
        const result = await response.json();
        const responseArea = document.getElementById(responseId);
        responseArea.textContent = JSON.stringify(result, null, 2);
        
        if (!response.ok) {
            responseArea.style.color = 'red';
        } else {
            responseArea.style.color = 'inherit';
        }
    } catch (error) {
        const responseArea = document.getElementById(responseId);
        responseArea.textContent = 'Error: ' + error.message;
        responseArea.style.color = 'red';
    }
}

// Token Operations
document.getElementById('calculateForm').addEventListener('submit', e => 
    handleFormSubmit(e, '/calculate'));

// Jupiter DEX
document.getElementById('quoteForm').addEventListener('submit', e => 
    handleFormSubmit(e, '/jupiter/quote'));
document.getElementById('swapForm').addEventListener('submit', e => 
    handleFormSubmit(e, '/jupiter/swap'));

// Sell Operations
document.getElementById('sellAllForm').addEventListener('submit', e => 
    handleFormSubmit(e, '/sell/all'));
document.getElementById('sellMaxForm').addEventListener('submit', e => 
    handleFormSubmit(e, '/sell/max'));
document.getElementById('sellPercentageForm').addEventListener('submit', e => 
    handleFormSubmit(e, '/sell/percentage'));

// Wallet Operations
document.getElementById('getBalancesBtn').addEventListener('click', () => 
    handleButtonClick('/wallet/balances', 'balancesResponse'));
document.getElementById('getTransactionsForm').addEventListener('submit', e => {
    e.preventDefault();
    const limit = e.target.limit.value;
    handleButtonClick(`/wallet/transactions?limit=${limit}`, 'transactionsResponse');
});

// Health Check
document.getElementById('healthCheckBtn').addEventListener('click', () => 
    handleButtonClick('/health', 'healthResponse'));

// Add common token addresses for easy testing
const commonTokens = {
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'SOL': 'So11111111111111111111111111111111111111112',
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

// Helper to fill token address fields with common tokens
function fillCommonTokens() {
    const tokenInputs = document.querySelectorAll('input[name="token_address"], input[name="input_token"], input[name="output_token"]');
    tokenInputs.forEach(input => {
        const select = document.createElement('select');
        select.className = 'form-select mb-2';
        select.innerHTML = `
            <option value="">Select a common token</option>
            ${Object.entries(commonTokens).map(([name, address]) => 
                `<option value="${address}">${name} (${address.slice(0,4)}...${address.slice(-4)})</option>`
            ).join('')}
        `;
        select.addEventListener('change', () => {
            input.value = select.value;
        });
        input.parentNode.insertBefore(select, input);
    });
}

// Initialize common tokens dropdown
fillCommonTokens();
