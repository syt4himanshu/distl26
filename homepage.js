function showWelcome() {
    document.getElementById('welcomePage').classList.add('active');
    document.getElementById('roleSelectionPage').classList.remove('active');
}

function showRoleSelection() {
    document.getElementById('welcomePage').classList.remove('active');
    document.getElementById('roleSelectionPage').classList.add('active');
}

function selectRole(role) {
    alert(`You selected: ${role.charAt(0).toUpperCase() + role.slice(1)}\n\nThis would typically redirect to the ${role} login page.`);
    // Here you would typically redirect to the specific role's login page
    // window.location.href = `${role}-login.html`;
}

// Add some interactive animations
document.addEventListener('DOMContentLoaded', function() {
    const roleCards = document.querySelectorAll('.role-card');
    
    roleCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});