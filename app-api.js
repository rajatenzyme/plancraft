// API integration overrides for TodoApp
(function () {
	const withCreds = (options = {}) => ({
		credentials: 'include',
		headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
		...options,
	});

	async function api(path, options) {
		const res = await fetch(path, withCreds(options));
		if (!res.ok) {
			let msg = 'Request failed';
			try {
				const data = await res.json();
				msg = data.message || msg;
			} catch {}
			const err = new Error(msg);
			err.status = res.status;
			throw err;
		}
		try {
			return await res.json();
		} catch {
			return null;
		}
	}

	// Replace auth status check
	TodoApp.prototype.checkAuthStatus = async function () {
		try {
			const me = await api('/api/auth/me', { method: 'GET' });
			this.currentUser = me;
			this.updateUIForAuthenticatedUser();
			this.todos = await this.loadTodos();
			this.renderKanbanBoard();
		} catch {
			this.currentUser = null;
			this.updateUIForGuestUser();
			this.todos = [];
			this.renderKanbanBoard();
		}
	};

	// Login
	TodoApp.prototype.handleLogin = async function (e) {
		e.preventDefault();
		const email = document.getElementById('loginEmail').value;
		const password = document.getElementById('loginPassword').value;
		try {
			const user = await api('/api/auth/login', {
				method: 'POST',
				body: JSON.stringify({ email, password }),
			});
			this.currentUser = user;
			this.updateUIForAuthenticatedUser();
			this.todos = await this.loadTodos();
			this.renderKanbanBoard();
			this.closeLogin();
			this.showSuccessMessage("Welcome back! You're now logged in.");
		} catch (err) {
			this.showErrorMessage(err.message || 'Login failed');
		}
	};

	// Signup
	TodoApp.prototype.handleSignup = async function (e) {
		e.preventDefault();
		const name = document.getElementById('signupName').value;
		const email = document.getElementById('signupEmail').value;
		const password = document.getElementById('signupPassword').value;
		const confirmPassword = document.getElementById('confirmPassword').value;
		if (password !== confirmPassword) {
			this.showErrorMessage('Passwords do not match.');
			return;
		}
		if (password.length < 6) {
			this.showErrorMessage('Password must be at least 6 characters long.');
			return;
		}
		try {
			const user = await api('/api/auth/signup', {
				method: 'POST',
				body: JSON.stringify({ name, email, password }),
			});
			this.currentUser = user;
			this.updateUIForAuthenticatedUser();
			this.todos = await this.loadTodos();
			this.renderKanbanBoard();
			this.closeSignup();
			this.showSuccessMessage('Account created successfully! Welcome to PlanCraft.');
		} catch (err) {
			this.showErrorMessage(err.message || 'Signup failed');
		}
	};

	// Logout
	TodoApp.prototype.logout = async function () {
		try {
			await api('/api/auth/logout', { method: 'POST' });
		} catch {}
		this.currentUser = null;
		this.todos = [];
		this.updateUIForGuestUser();
		this.renderKanbanBoard();
		this.showSuccessMessage('You have been logged out successfully.');
	};

	// Load todos from API
	TodoApp.prototype.loadTodos = async function () {
		if (!this.currentUser) return [];
		try {
			const todos = await api('/api/todos', { method: 'GET' });
			return todos || [];
		} catch {
			return [];
		}
	};

	// Add todo via API
	TodoApp.prototype.addTodo = async function () {
		const text = this.todoInput.value.trim();
		if (text === '' || !this.currentUser) return;
		try {
			const created = await api('/api/todos', {
				method: 'POST',
				body: JSON.stringify({ text, status: 'todo', completed: false, createdAt: new Date().toISOString() }),
			});
			this.todos.push(created);
			this.renderKanbanBoard();
			this.todoInput.value = '';
		} catch (err) {
			this.showErrorMessage(err.message || 'Failed to add task');
		}
	};

	// Edit todo via API (inline)
	TodoApp.prototype.editTodo = async function (id, text) {
		const todo = this.todos.find((t) => t.id === id || t.id === String(id));
		if (!todo) return;
		const newText = (text || '').trim();
		if (!newText || newText === todo.text) return;
		try {
			const updated = await api(`/api/todos/${todo.id}`, {
				method: 'PUT',
				body: JSON.stringify({ text: newText }),
			});
			Object.assign(todo, updated);
			this.renderKanbanBoard();
			this.showSuccessMessage('Task updated');
		} catch (err) {
			this.showErrorMessage(err.message || 'Failed to update task');
		}
	};

	// Delete todo via API
	TodoApp.prototype.deleteTodo = async function (id) {
		try {
			await api(`/api/todos/${id}`, { method: 'DELETE' });
			this.todos = this.todos.filter((t) => t.id !== id && t.id !== String(id));
			this.renderKanbanBoard();
		} catch (err) {
			this.showErrorMessage(err.message || 'Failed to delete task');
		}
	};

	// Toggle complete and move status via API
	TodoApp.prototype.toggleTodo = async function (id) {
		const todo = this.todos.find((t) => t.id === id || t.id === String(id));
		if (!todo) return;
		const newCompleted = !todo.completed;
		const newStatus = newCompleted ? 'done' : 'progress';
		try {
			const updated = await api(`/api/todos/${todo.id}`, {
				method: 'PUT',
				body: JSON.stringify({ completed: newCompleted, status: newStatus }),
			});
			Object.assign(todo, updated);
			this.renderKanbanBoard();
		} catch (err) {
			this.showErrorMessage(err.message || 'Failed to update task');
		}
	};

	// Move task to status via API
	TodoApp.prototype.moveTaskToStatus = async function (taskId, newStatus) {
		const todo = this.todos.find((t) => t.id === taskId || t.id === String(taskId));
		if (!todo || todo.status === newStatus) return;
		const newCompleted = newStatus === 'done';
		try {
			const updated = await api(`/api/todos/${todo.id}`, {
				method: 'PUT',
				body: JSON.stringify({ status: newStatus, completed: newCompleted }),
			});
			Object.assign(todo, updated);
			this.renderKanbanBoard();
			this.showMoveNotification(todo.text, newStatus);
		} catch (err) {
			this.showErrorMessage(err.message || 'Failed to move task');
		}
	};

	// Reorder handler: persist order and status snapshot
	TodoApp.prototype.updateKanbanOrder = async function () {
		const columns = [this.todoColumn, this.progressColumn, this.doneColumn];
		const statuses = ['todo', 'progress', 'done'];
		let items = [];
		columns.forEach((column, index) => {
			const taskElements = Array.from(column.querySelectorAll('.kanban-task'));
			taskElements.forEach((element, order) => {
				const taskId = element.dataset.id;
				items.push({ id: taskId, status: statuses[index], order });
			});
		});
		try {
			await api('/api/todos/reorder', { method: 'POST', body: JSON.stringify({ items }) });
			// update local state
			items.forEach((i) => {
				const t = this.todos.find((x) => x.id === i.id || x.id === String(i.id));
				if (t) {
					t.status = i.status;
					t.order = i.order;
				}
			});
		} catch (err) {
			this.showErrorMessage(err.message || 'Failed to save order');
		}
	};

	// SaveTodos becomes a thin reorder persistence (no-op when not logged in)
	TodoApp.prototype.saveTodos = function () {
		if (!this.currentUser) return;
		this.updateKanbanOrder();
	};
})();
