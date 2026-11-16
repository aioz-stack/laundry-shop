<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderSequence extends Model
{
    protected $fillable = ['scope', 'sequence_date', 'last_number'];
}
