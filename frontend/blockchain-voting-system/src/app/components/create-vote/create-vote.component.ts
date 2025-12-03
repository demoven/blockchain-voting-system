import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VoteService } from '../../services/vote.service';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-vote',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './create-vote.component.html',
  styleUrls: ['./create-vote.component.css']
})
export class CreateVoteComponent implements OnInit {
  voteForm: FormGroup;
  errorMessage = '';
  users: any[] = [];
  filteredUsers: any[] = [];
  searchTerm: string = '';
  selectedUsers: Set<string> = new Set();

  constructor(
    private voteService: VoteService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: ModalService,
    private authService: AuthService
  ) {
    this.voteForm = this.fb.group({
      subject: ['', Validators.required],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required)
      ])
    });
  }

  ngOnInit() {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = users;
      },
      error: (err) => {
        console.error('Failed to fetch users', err);
        // Optionally handle error, e.g. show message
      }
    });
  }

  get options() {
    return this.voteForm.get('options') as FormArray;
  }

  addOption() {
    this.options.push(this.fb.control('', Validators.required));
  }

  removeOption(index: number) {
    this.options.removeAt(index);
  }

  filterUsers() {
    if (!this.searchTerm) {
      this.filteredUsers = this.users;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.email.toLowerCase().includes(term) || user.uid.includes(term)
      );
    }
  }

  toggleUserSelection(uid: string) {
    if (this.selectedUsers.has(uid)) {
      this.selectedUsers.delete(uid);
    } else {
      this.selectedUsers.add(uid);
    }
  }

  isUserSelected(uid: string): boolean {
    return this.selectedUsers.has(uid);
  }

  onSubmit() {
    if (this.voteForm.invalid) return;

    const { subject, options } = this.voteForm.value;
    const votersUid = Array.from(this.selectedUsers);

    this.voteService.createVote(subject, options, votersUid).subscribe({
      next: () => {
        this.modalService.open('Success', 'Vote created successfully!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Failed to create vote';
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
