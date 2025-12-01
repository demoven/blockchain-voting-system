import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { VoteComponent } from './components/vote/vote.component';
import { CreateVoteComponent } from './components/create-vote/create-vote.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: '', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'vote/:id', component: VoteComponent, canActivate: [AuthGuard] },
    { path: 'create-vote', component: CreateVoteComponent, canActivate: [AdminGuard] },
    { path: '**', redirectTo: '' }
];
