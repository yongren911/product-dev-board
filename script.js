// 默认项目数据，后续可在这里继续扩展字段
const projects = [
  {
    name: "BSR 空气甲护膝 26款",
    priority: "S类",
    status: "生产文档整理中",
    nextStep: "确认最终生产资料",
  },
  {
    name: "深护 TFCC 护腕超薄款",
    priority: "A类",
    status: "推进 BOM 和打样图稿",
    nextStep: "完善结构细节",
  },
  {
    name: "7D 签名护膝",
    priority: "B类",
    status: "等待配色方案",
    nextStep: "同步 Logo 方案",
  },
  {
    name: "签名版 Pro 单髌骨带",
    priority: "A类",
    status: "等待样品确认",
    nextStep: "确认样品外观",
  },
];

const projectGrid = document.querySelector("#project-grid");
const filterButtons = document.querySelectorAll(".filter-button");
const visibleCount = document.querySelector("#visible-count");
const addProjectForm = document.querySelector("#add-project-form");

let activeFilter = "全部";

function getPriorityClass(priority) {
  return priority.replace("类", "").toLowerCase();
}


function getPriorityProgress(priority) {
  const priorityProgress = {
    "S类": "82%",
    "A类": "64%",
    "B类": "46%",
  };

  return priorityProgress[priority] || "56%";
}

function escapeHTML(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));
}

function getTrimmedValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function setActiveFilter(filter) {
  activeFilter = filter;

  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === activeFilter);
  });
}

// 根据筛选条件渲染项目卡片
function renderProjects(filter = activeFilter) {
  const visibleProjects = filter === "全部"
    ? projects
    : projects.filter((project) => project.priority === filter);

  visibleCount.textContent = visibleProjects.length;

  if (visibleProjects.length === 0) {
    projectGrid.innerHTML = '<p class="empty-state">暂无符合该优先级的项目</p>';
    return;
  }

  projectGrid.innerHTML = visibleProjects.map((project) => `
    <article class="project-card priority-${getPriorityClass(project.priority)}">
      <div class="card-top">
        <div class="card-title-group">
          <span class="project-code">Dev Sprint / ${getPriorityClass(project.priority).toUpperCase()}-Guard</span>
          <h2>${escapeHTML(project.name)}</h2>
        </div>
        <span class="priority-badge ${getPriorityClass(project.priority)}">${project.priority}</span>
      </div>
      <div class="card-detail">
        <div class="detail-item">
          <span class="detail-label">当前状态</span>
          <p class="detail-value">${escapeHTML(project.status)}</p>
        </div>
        <div class="detail-item">
          <span class="detail-label">下一步任务</span>
          <p class="detail-value">${escapeHTML(project.nextStep)}</p>
        </div>
      </div>
      <div class="card-footer" aria-hidden="true">
        <span>Impact Readiness</span>
        <div class="progress-track"><span style="--progress: ${getPriorityProgress(project.priority)}"></span></div>
      </div>
    </article>
  `).join("");
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveFilter(button.dataset.filter);
    renderProjects();
  });
});

addProjectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(addProjectForm);
  const newProject = {
    name: getTrimmedValue(formData, "name"),
    priority: getTrimmedValue(formData, "priority"),
    status: getTrimmedValue(formData, "status"),
    nextStep: getTrimmedValue(formData, "nextStep"),
  };

  if (!newProject.name || !newProject.priority || !newProject.status || !newProject.nextStep) {
    return;
  }

  projects.unshift(newProject);
  addProjectForm.reset();
  setActiveFilter(newProject.priority);
  renderProjects();
});

renderProjects();
