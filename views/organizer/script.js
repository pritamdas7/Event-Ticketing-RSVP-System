document.addEventListener('DOMContentLoaded', () => {
  const sidebarItems = Array.from(document.querySelectorAll('.sidebar li'));
  const contentSections = Array.from(document.querySelectorAll('.content-section'));
  const exportButton = document.getElementById('exportBtn');
  const wizardForm = document.querySelector('.wizard-form');
  const wizardButton = document.getElementById('generateEventBtn');

  sidebarItems.forEach((item) => {
    item.addEventListener('click', () => {
      sidebarItems.forEach((entry) => entry.classList.remove('active'));
      item.classList.add('active');

      const targetSectionId = item.dataset.target;
      contentSections.forEach((section) => {
        if (section.id === targetSectionId) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });
    });
  });

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      exportButton.textContent = 'Report ready';
      window.setTimeout(() => {
        exportButton.textContent = 'Export Report';
      }, 1200);
    });
  }

  if (wizardButton && wizardForm) {
    wizardButton.addEventListener('click', () => {
      const eventName = document.getElementById('wizardEventName').value.trim();
      const dateValue = document.getElementById('wizardDate').value;
      const capacity = document.getElementById('wizardCapacity').value.trim();

      const summaryText = eventName && dateValue && capacity
        ? `Draft saved for ${eventName} with capacity ${capacity}.`
        : 'Fill out the event details to generate a draft.';

      const summary = document.createElement('p');
      summary.className = 'wizard-summary';
      summary.textContent = summaryText;

      const existingSummary = wizardForm.querySelector('.wizard-summary');
      if (existingSummary) {
        existingSummary.remove();
      }
      wizardForm.appendChild(summary);
    });
  }
});